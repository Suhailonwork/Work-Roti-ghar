'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { DOC_TYPES, MAX_DOC_BYTES, optionalFile, removeFile, uploadFile } from '@/lib/storage';
import {
  beneficiarySchema,
  distributionSchema,
  rationKitSchema,
  toFormErrors,
  type FormState,
} from '@/lib/validation';

type ActionResult = { ok: boolean; message?: string };

const ADMIN = ['admin'] as const;

function failure(error: unknown): FormState {
  return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
}

// ----------------------------------------------------------- beneficiaries --
export async function saveBeneficiaryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = beneficiarySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  const payload = {
    name: values.name,
    phone: values.phone || null,
    address: values.address || null,
    area: values.area || null,
    family_size: values.family_size,
    notes: values.notes || null,
    status: values.status,
  };

  if (id) {
    const { data: before } = await supabase.from('beneficiaries').select('*').eq('id', id).maybeSingle();
    const { error } = await supabase.from('beneficiaries').update(payload).eq('id', id);
    if (error) return { ok: false, message: error.message };

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'beneficiary.updated',
      entityType: 'beneficiary',
      entityId: id,
      summary: `Updated the record for ${values.name}`,
      before: before ?? null,
      after: payload,
    });
  } else {
    const { data, error } = await supabase
      .from('beneficiaries')
      .insert({ ...payload, created_by: user.id })
      .select('id')
      .single();

    if (error || !data) return { ok: false, message: error?.message ?? 'The family could not be saved.' };

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'beneficiary.created',
      entityType: 'beneficiary',
      entityId: data.id,
      summary: `Added ${values.name} (household of ${values.family_size})`,
      after: payload,
    });
  }

  revalidatePath('/admin/beneficiaries');
  revalidatePath('/ration');
  return { ok: true, message: id ? 'Family record updated.' : 'Family added.' };
}

export async function deleteBeneficiaryAction(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from('beneficiaries').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('beneficiaries').delete().eq('id', id);

  if (error) {
    // A family with distribution history is protected by a foreign key.
    if (error.code === '23503') {
      return {
        ok: false,
        message:
          'This family has distribution history, so the record cannot be deleted. Set the status to archived instead.',
      };
    }
    return { ok: false, message: error.message };
  }

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'beneficiary.deleted',
    entityType: 'beneficiary',
    entityId: id,
    summary: `Deleted the record for ${before?.name ?? 'a family'}`,
    before: before ?? null,
  });

  revalidatePath('/admin/beneficiaries');
  return { ok: true, message: 'Family record deleted.' };
}

// ------------------------------------------------------------- ration kits --
export async function saveRationKitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  // Items arrive as parallel arrays from the repeating rows in the form.
  const names = formData.getAll('item_name').map((v) => v.toString());
  const quantities = formData.getAll('item_quantity').map((v) => v.toString());
  const units = formData.getAll('item_unit').map((v) => v.toString());

  const items = names
    .map((name, index) => ({
      item_name: name.trim(),
      quantity: quantities[index] ?? '',
      unit: (units[index] ?? 'KG').trim(),
    }))
    .filter((item) => item.item_name && item.quantity);

  const parsed = rationKitSchema.safeParse({
    id: formData.get('id') || undefined,
    name: formData.get('name') ?? '',
    description: formData.get('description') ?? '',
    estimated_cost: formData.get('estimated_cost') || 0,
    is_active: formData.get('is_active') === 'on',
    items,
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { id, items: kitItems, ...values } = parsed.data;
  const supabase = await createClient();

  const payload = {
    name: values.name,
    description: values.description || null,
    estimated_cost: values.estimated_cost,
    is_active: values.is_active,
  };

  let kitId = id;

  if (kitId) {
    const { error } = await supabase.from('ration_kits').update(payload).eq('id', kitId);
    if (error) return { ok: false, message: error.message };
    // Replace the item list wholesale — simpler and safer than diffing rows.
    await supabase.from('ration_kit_items').delete().eq('kit_id', kitId);
  } else {
    const { data, error } = await supabase
      .from('ration_kits')
      .insert({ ...payload, created_by: user.id })
      .select('id')
      .single();
    if (error || !data) return { ok: false, message: error?.message ?? 'The kit could not be saved.' };
    kitId = data.id;
  }

  const { error: itemsError } = await supabase.from('ration_kit_items').insert(
    kitItems.map((item, index) => ({
      kit_id: kitId!,
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      position: index,
    })),
  );

  if (itemsError) return { ok: false, message: itemsError.message };

  await recordAudit(supabase, {
    actorId: user.id,
    action: id ? 'kit.updated' : 'kit.created',
    entityType: 'ration_kit',
    entityId: kitId!,
    summary: `${id ? 'Updated' : 'Created'} the kit "${values.name}" with ${kitItems.length} items`,
    after: { ...payload, items: kitItems },
  });

  revalidatePath('/admin/ration-kits');
  revalidatePath('/ration');
  return { ok: true, message: id ? 'Kit updated.' : 'Kit created.' };
}

export async function deleteRationKitAction(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from('ration_kits').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('ration_kits').delete().eq('id', id);

  if (error) {
    if (error.code === '23503') {
      return {
        ok: false,
        message: 'This kit has been distributed, so it cannot be deleted. Mark it inactive instead.',
      };
    }
    return { ok: false, message: error.message };
  }

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'kit.deleted',
    entityType: 'ration_kit',
    entityId: id,
    summary: `Deleted the kit "${before?.name ?? 'unknown'}"`,
    before: before ?? null,
  });

  revalidatePath('/admin/ration-kits');
  return { ok: true, message: 'Kit deleted.' };
}

// ------------------------------------------------------------ distributions --
export async function saveDistributionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = distributionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  // Optional proof of delivery, kept in the private `proofs` bucket.
  const proof = optionalFile(formData, 'proof');
  let proofPath: string | undefined;

  if (proof) {
    try {
      const upload = await uploadFile(supabase, {
        bucket: 'proofs',
        folder: 'distributions',
        file: proof,
        allowedTypes: DOC_TYPES,
        maxBytes: MAX_DOC_BYTES,
      });
      proofPath = upload.path;
    } catch (error) {
      return { ok: false, errors: { proof: [error instanceof Error ? error.message : 'Upload failed.'] } };
    }
  }

  const payload = {
    beneficiary_id: values.beneficiary_id,
    kit_id: values.kit_id,
    quantity: values.quantity,
    distributed_on: values.distributed_on,
    distributed_by: values.distributed_by ?? user.id,
    notes: values.notes || null,
    ...(proofPath ? { proof_bucket: 'proofs', proof_path: proofPath } : {}),
  };

  if (id) {
    const { data: before } = await supabase.from('distributions').select('*').eq('id', id).maybeSingle();

    const { error } = await supabase.from('distributions').update(payload).eq('id', id);
    if (error) return { ok: false, message: error.message };

    // Replace an old proof only once the new one is safely stored.
    if (proofPath && before?.proof_path) {
      await removeFile(supabase, before.proof_bucket ?? 'proofs', before.proof_path);
    }

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'distribution.updated',
      entityType: 'distribution',
      entityId: id,
      summary: `Updated a distribution record`,
      before: before ?? null,
      after: payload,
    });
  } else {
    const { data, error } = await supabase
      .from('distributions')
      .insert({ ...payload, created_by: user.id })
      .select('id')
      .single();

    if (error || !data) {
      if (proofPath) await removeFile(supabase, 'proofs', proofPath);
      return { ok: false, message: error?.message ?? 'The distribution could not be recorded.' };
    }

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'distribution.created',
      entityType: 'distribution',
      entityId: data.id,
      summary: `Recorded ${values.quantity} kit(s) delivered on ${values.distributed_on}`,
      after: payload,
    });
  }

  revalidatePath('/admin/distributions');
  revalidatePath('/ration');
  revalidatePath('/dashboard');
  return { ok: true, message: id ? 'Distribution updated.' : 'Distribution recorded.' };
}

export async function deleteDistributionAction(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from('distributions').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('distributions').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  if (before?.proof_path) {
    await removeFile(supabase, before.proof_bucket ?? 'proofs', before.proof_path);
  }

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'distribution.deleted',
    entityType: 'distribution',
    entityId: id,
    summary: 'Deleted a distribution record',
    before: before ?? null,
  });

  revalidatePath('/admin/distributions');
  revalidatePath('/ration');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Distribution deleted.' };
}

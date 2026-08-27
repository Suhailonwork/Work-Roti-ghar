'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { DOC_TYPES, MAX_DOC_BYTES, optionalFile, removeFile, uploadFile } from '@/lib/storage';
import {
  contributionSchema,
  documentSchema,
  expenseSchema,
  toFormErrors,
  verifySchema,
  type FormState,
} from '@/lib/validation';
import { formatCurrency } from '@/lib/utils';

type ActionResult = { ok: boolean; message?: string };

const ADMIN = ['admin'] as const;

/**
 * Fields that mark a record as verified.
 *
 * Only administrators can create finance records, so an entry an administrator
 * has just typed in is already the checked version of itself — holding it at
 * `pending` would mean the balance ignored money they had personally recorded
 * until they clicked a second button. Verification remains a real state: any
 * row can still be reopened or rejected afterwards from the ledger, and the
 * balance follows it.
 */
function verifiedBy(userId: string) {
  return {
    verification_status: 'verified' as const,
    verified_by: userId,
    verified_at: new Date().toISOString(),
  };
}

function failure(error: unknown): FormState {
  return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
}

/**
 * NOTE ON PAYMENT DATA
 * Receipts are stored as files in a private bucket and referenced by a
 * transaction id. Nothing here accepts or persists a banking password, a UPI
 * PIN, a card number or a CVV, and no schema column exists to hold one.
 */

// ------------------------------------------------------------ contributions --
export async function saveContributionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = contributionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const isAdmin = user.profile.role === 'admin';

  const receipt = optionalFile(formData, 'receipt');
  let receiptPath: string | undefined;

  if (receipt) {
    try {
      const upload = await uploadFile(supabase, {
        bucket: 'receipts',
        folder: 'contributions',
        file: receipt,
        allowedTypes: DOC_TYPES,
        maxBytes: MAX_DOC_BYTES,
      });
      receiptPath = upload.path;
    } catch (error) {
      return { ok: false, errors: { receipt: [error instanceof Error ? error.message : 'Upload failed.'] } };
    }
  }

  // When a member is chosen the stored name comes from their profile, never
  // from the form, so the ledger cannot end up crediting one member under
  // another member's name.
  let contributorName = values.contributor_name;

  if (values.contributor_id) {
    const { data: member } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', values.contributor_id)
      .maybeSingle();

    if (!member) {
      return { ok: false, errors: { contributor_id: ['That member could not be found.'] } };
    }
    contributorName = member.full_name;
  }

  if (!contributorName) {
    return { ok: false, errors: { contributor_name: ['Choose a member, or type a contributor name.'] } };
  }

  const payload = {
    contributor_id: values.contributor_id ?? null,
    contributor_name: contributorName,
    amount: values.amount,
    contributed_on: values.contributed_on,
    payment_method: values.payment_method,
    transaction_ref: values.transaction_ref || null,
    purpose: values.purpose || null,
    notes: values.notes || null,
    ...(receiptPath ? { receipt_bucket: 'receipts', receipt_path: receiptPath } : {}),
  };

  if (id) {
    if (!isAdmin) return { ok: false, message: 'Only an administrator can edit a recorded contribution.' };

    const { data: before } = await supabase.from('contributions').select('*').eq('id', id).maybeSingle();
    const { error } = await supabase.from('contributions').update(payload).eq('id', id);
    if (error) return { ok: false, message: error.message };

    if (receiptPath && before?.receipt_path) {
      await removeFile(supabase, before.receipt_bucket ?? 'receipts', before.receipt_path);
    }

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'contribution.updated',
      entityType: 'contribution',
      entityId: id,
      summary: `Updated a contribution of ${formatCurrency(values.amount)} from ${contributorName}`,
      before: before ?? null,
      after: payload,
    });
  } else {
    const { data, error } = await supabase
      .from('contributions')
      .insert({
        ...payload,
        // Counts towards the balance straight away, and the trigger on this
        // table credits the linked member's contribution points.
        ...verifiedBy(user.id),
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      if (receiptPath) await removeFile(supabase, 'receipts', receiptPath);
      return { ok: false, message: error?.message ?? 'The contribution could not be recorded.' };
    }

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'contribution.created',
      entityType: 'contribution',
      entityId: data.id,
      summary: `Recorded ${formatCurrency(values.amount)} from ${contributorName}`,
      after: payload,
    });
  }

  revalidatePath('/admin/contributions');
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { ok: true, message: id ? 'Contribution updated.' : 'Contribution recorded.' };
}

export async function verifyContributionAction(id: string, status: 'pending' | 'verified' | 'rejected'): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = verifySchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const supabase = await createClient();
  const { data: before } = await supabase.from('contributions').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase
    .from('contributions')
    .update({
      verification_status: parsed.data.status,
      verified_by: parsed.data.status === 'pending' ? null : user.id,
      verified_at: parsed.data.status === 'pending' ? null : new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'contribution.verified',
    entityType: 'contribution',
    entityId: id,
    summary: `Marked a contribution of ${formatCurrency(before?.amount ?? 0)} as ${parsed.data.status}`,
    before: before ? { verification_status: before.verification_status } : null,
    after: { verification_status: parsed.data.status },
  });

  revalidatePath('/admin/contributions');
  revalidatePath('/admin');
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { ok: true, message: `Contribution marked ${parsed.data.status}.` };
}

export async function deleteContributionAction(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from('contributions').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('contributions').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  if (before?.receipt_path) {
    await removeFile(supabase, before.receipt_bucket ?? 'receipts', before.receipt_path);
  }

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'contribution.deleted',
    entityType: 'contribution',
    entityId: id,
    summary: `Deleted a contribution of ${formatCurrency(before?.amount ?? 0)}`,
    before: before ?? null,
  });

  revalidatePath('/admin/contributions');
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Contribution deleted.' };
}

// ----------------------------------------------------------------- expenses --
export async function saveExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const isAdmin = user.profile.role === 'admin';

  const receipt = optionalFile(formData, 'receipt');
  let receiptPath: string | undefined;

  if (receipt) {
    try {
      const upload = await uploadFile(supabase, {
        bucket: 'receipts',
        folder: 'expenses',
        file: receipt,
        allowedTypes: DOC_TYPES,
        maxBytes: MAX_DOC_BYTES,
      });
      receiptPath = upload.path;
    } catch (error) {
      return { ok: false, errors: { receipt: [error instanceof Error ? error.message : 'Upload failed.'] } };
    }
  }

  const payload = {
    category: values.category,
    amount: values.amount,
    spent_on: values.spent_on,
    description: values.description,
    vendor: values.vendor || null,
    ...(receiptPath ? { receipt_bucket: 'receipts', receipt_path: receiptPath } : {}),
  };

  if (id) {
    if (!isAdmin) return { ok: false, message: 'Only an administrator can edit a recorded expense.' };

    const { data: before } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle();
    const { error } = await supabase.from('expenses').update(payload).eq('id', id);
    if (error) return { ok: false, message: error.message };

    if (receiptPath && before?.receipt_path) {
      await removeFile(supabase, before.receipt_bucket ?? 'receipts', before.receipt_path);
    }

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'expense.updated',
      entityType: 'expense',
      entityId: id,
      summary: `Updated an expense of ${formatCurrency(values.amount)} (${values.category})`,
      before: before ?? null,
      after: payload,
    });
  } else {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...payload, ...verifiedBy(user.id), created_by: user.id })
      .select('id')
      .single();

    if (error || !data) {
      if (receiptPath) await removeFile(supabase, 'receipts', receiptPath);
      return { ok: false, message: error?.message ?? 'The expense could not be recorded.' };
    }

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'expense.created',
      entityType: 'expense',
      entityId: data.id,
      summary: `Recorded ${formatCurrency(values.amount)} for ${values.category}`,
      after: payload,
    });
  }

  revalidatePath('/admin/expenses');
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { ok: true, message: id ? 'Expense updated.' : 'Expense recorded.' };
}

export async function verifyExpenseAction(id: string, status: 'pending' | 'verified' | 'rejected'): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = verifySchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const supabase = await createClient();
  const { data: before } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase
    .from('expenses')
    .update({
      verification_status: parsed.data.status,
      verified_by: parsed.data.status === 'pending' ? null : user.id,
      verified_at: parsed.data.status === 'pending' ? null : new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'expense.verified',
    entityType: 'expense',
    entityId: id,
    summary: `Marked an expense of ${formatCurrency(before?.amount ?? 0)} as ${parsed.data.status}`,
    before: before ? { verification_status: before.verification_status } : null,
    after: { verification_status: parsed.data.status },
  });

  revalidatePath('/admin/expenses');
  revalidatePath('/admin');
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { ok: true, message: `Expense marked ${parsed.data.status}.` };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  if (before?.receipt_path) {
    await removeFile(supabase, before.receipt_bucket ?? 'receipts', before.receipt_path);
  }

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'expense.deleted',
    entityType: 'expense',
    entityId: id,
    summary: `Deleted an expense of ${formatCurrency(before?.amount ?? 0)}`,
    before: before ?? null,
  });

  revalidatePath('/admin/expenses');
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Expense deleted.' };
}

// ---------------------------------------------------------------- documents --
export async function uploadDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = documentSchema.safeParse({
    title: formData.get('title') ?? '',
    description: formData.get('description') ?? '',
    category: formData.get('category') ?? '',
    is_private: formData.get('is_private') !== 'off',
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const file = optionalFile(formData, 'file');
  if (!file) return { ok: false, errors: { file: ['Choose a file to upload.'] } };

  const supabase = await createClient();

  try {
    const upload = await uploadFile(supabase, {
      bucket: 'documents',
      folder: 'library',
      file,
      allowedTypes: [...DOC_TYPES, 'text/csv', 'application/vnd.ms-excel', 'application/msword', 'text/plain'],
      maxBytes: MAX_DOC_BYTES,
    });

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category || null,
        is_private: parsed.data.is_private,
        bucket: upload.bucket,
        path: upload.path,
        mime_type: upload.mimeType,
        size_bytes: upload.size,
        uploaded_by: user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      await removeFile(supabase, upload.bucket, upload.path);
      return { ok: false, message: error?.message ?? 'The document could not be saved.' };
    }

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'document.uploaded',
      entityType: 'document',
      entityId: data.id,
      summary: `Uploaded "${parsed.data.title}"`,
    });
  } catch (error) {
    return { ok: false, errors: { file: [error instanceof Error ? error.message : 'Upload failed.'] } };
  }

  revalidatePath('/admin/documents');
  return { ok: true, message: 'Document uploaded.' };
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  if (before?.path) await removeFile(supabase, before.bucket, before.path);

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'document.deleted',
    entityType: 'document',
    entityId: id,
    summary: `Deleted "${before?.title ?? 'a document'}"`,
    before: before ?? null,
  });

  revalidatePath('/admin/documents');
  return { ok: true, message: 'Document deleted.' };
}

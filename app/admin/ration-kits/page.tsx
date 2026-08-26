import type { Metadata } from 'next';
import { Package } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DeleteKitButton, EditKitButton, NewKitButton, type KitView } from '@/components/admin/RationKitForm';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, SectionHeading } from '@/components/ui';
import { buildStaticMetadata } from '@/lib/seo';
import { formatCurrency } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Ration kits', path: '/admin/ration-kits', noIndex: true });
}

export default async function RationKitsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from('ration_kits')
    .select('id, name, description, estimated_cost, is_active, items:ration_kit_items(item_name, quantity, unit, position)')
    .order('created_at', { ascending: true });

  const kits = ((data ?? []) as unknown as (KitView & {
    items: { item_name: string; quantity: number; unit: string; position: number }[];
  })[]).map((kit) => ({
    ...kit,
    items: [...(kit.items ?? [])].sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Ration kits"
        description="What a family receives. Editing a kit does not change distributions already recorded against it."
        action={<NewKitButton />}
      />

      {kits.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title="No kits yet"
          description="Create the standard kit so volunteers can log distributions against it."
          action={<NewKitButton />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {kits.map((kit) => (
            <Card key={kit.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {kit.name}
                      {kit.is_active ? (
                        <Badge tone="green">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Inactive</Badge>
                      )}
                    </CardTitle>
                    {kit.description && <p className="mt-1 text-sm text-clay-600">{kit.description}</p>}
                  </div>
                  {Number(kit.estimated_cost) > 0 && (
                    <span className="whitespace-nowrap text-sm font-medium text-clay-700">
                      {formatCurrency(kit.estimated_cost)} / kit
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardBody>
                <ul className="divide-y divide-clay-200">
                  {kit.items.map((item, index) => (
                    <li key={index} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <span className="text-sm text-clay-800">{item.item_name}</span>
                      <span className="text-sm font-medium tabular-nums text-clay-600">
                        {Number(item.quantity) % 1 === 0 ? Number(item.quantity) : item.quantity} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex gap-2 border-t border-clay-200 pt-3">
                  <EditKitButton kit={kit} />
                  <DeleteKitButton id={kit.id} name={kit.name} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

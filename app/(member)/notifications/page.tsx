import type { Metadata } from 'next';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { markAllNotificationsReadAction } from '@/lib/actions/notifications';
import { Avatar, Card, CardBody, EmptyState, SectionHeading } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { buildStaticMetadata } from '@/lib/seo';
import { cn, timeAgo } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Notifications', path: '/notifications', noIndex: true });
}

export default async function NotificationsPage() {
  const user = await requireApproved('/notifications');
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(id, full_name, avatar_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60);

  const rows = (notifications ?? []) as unknown as (Record<string, unknown> & {
    actor: { id: string; full_name: string; avatar_url: string | null } | null;
  })[];

  const unreadCount = rows.filter((row) => !row.is_read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionHeading
        title="Notifications"
        description={unreadCount ? `${unreadCount} unread` : 'You are all caught up.'}
        action={
          unreadCount > 0 ? (
            <form
              action={async () => {
                'use server';
                await markAllNotificationsReadAction();
              }}
            >
              <SubmitButton variant="secondary" size="sm" pendingLabel="Marking…">
                Mark all as read
              </SubmitButton>
            </form>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="Nothing yet"
          description="Likes, comments, mentions and reminders will show up here."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-clay-200">
              {rows.map((row) => {
                const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
                const link = (row.link as string) || '/dashboard';

                return (
                  <li key={row.id as string}>
                    <Link
                      href={link}
                      className={cn(
                        'flex gap-3 px-4 py-3.5 transition-colors hover:bg-cream-100',
                        !row.is_read && 'bg-brand-50/60',
                      )}
                    >
                      {actor ? (
                        <Avatar src={actor.avatar_url} name={actor.full_name} size={38} />
                      ) : (
                        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800">
                          <Bell className="h-4 w-4" aria-hidden />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-clay-900">{row.title as string}</p>
                        {Boolean(row.body) && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-clay-600">{row.body as string}</p>
                        )}
                        <p className="mt-1 text-xs text-clay-500">{timeAgo(row.created_at as string)}</p>
                      </div>

                      {!row.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

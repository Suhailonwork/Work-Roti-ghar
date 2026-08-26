'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flag, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createCommentAction,
  deleteCommentAction,
  toggleCommentLikeAction,
} from '@/lib/actions/feed';
import { Avatar, Badge, Textarea } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Modal } from '@/components/ui/Modal';
import { ReportModal } from './PostInteractions';
import { cn, timeAgo } from '@/lib/utils';
import type { FeedComment } from '@/lib/feed/queries';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

function CommentForm({
  postId,
  parentId,
  placeholder,
  onDone,
  compact,
}: {
  postId: string;
  parentId?: string;
  placeholder: string;
  onDone?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(createCommentAction, initialState);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (state.ok) {
      setValue('');
      onDone?.();
      router.refresh();
    }
    // `state` is replaced wholesale on each submission, so this fires once per success.
  }, [state, onDone, router]);

  return (
    <form action={formAction} className={cn('space-y-2', compact && 'mt-2')}>
      <input type="hidden" name="post_id" value={postId} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}

      <Textarea
        name="content"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        maxLength={4000}
        required
      />

      {state.errors?.content && <p className="text-sm text-red-700">{state.errors.content[0]}</p>}
      {!state.ok && state.message && <p className="text-sm text-red-700">{state.message}</p>}

      <div className="flex justify-end gap-2">
        {onDone && (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        )}
        <SubmitButton size="sm" disabled={!value.trim()} pendingLabel="Posting…">
          {parentId ? 'Reply' : 'Comment'}
        </SubmitButton>
      </div>
    </form>
  );
}

function CommentRow({
  comment,
  postId,
  viewerId,
  viewerIsAdmin,
  depth = 0,
}: {
  comment: FeedComment;
  postId: string;
  viewerId: string;
  viewerIsAdmin: boolean;
  depth?: number;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(comment.liked_by_me);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [replying, setReplying] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const canDelete = viewerIsAdmin || comment.author?.id === viewerId;

  function like() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));

    startTransition(async () => {
      const result = await toggleCommentLikeAction(comment.id);
      if (!result.ok) {
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  return (
    <li className={cn(depth > 0 && 'ml-6 border-l border-clay-200 pl-4 sm:ml-9')}>
      <div className="flex gap-3 py-3">
        {comment.author ? (
          <Link href={`/members/${comment.author.id}`} className="shrink-0">
            <Avatar src={comment.author.avatar_url} name={comment.author.full_name} size={34} />
          </Link>
        ) : (
          <Avatar name="?" size={34} />
        )}

        <div className="min-w-0 flex-1">
          <div className="rounded-xl bg-cream-100 px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {comment.author ? (
                <Link
                  href={`/members/${comment.author.id}`}
                  className="text-sm font-medium text-clay-900 hover:underline"
                >
                  {comment.author.full_name}
                </Link>
              ) : (
                <span className="text-sm font-medium text-clay-500">A former member</span>
              )}
              {comment.author?.role === 'admin' && <Badge tone="purple">Admin</Badge>}
              <span className="text-xs text-clay-500">{timeAgo(comment.created_at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-clay-800">{comment.content}</p>
          </div>

          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={like}
              disabled={pending}
              aria-pressed={liked}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-clay-600 hover:bg-clay-100',
                liked && 'text-red-600',
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} aria-hidden />
              {likeCount > 0 && likeCount}
              <span className="sr-only">likes</span>
            </button>

            {depth === 0 && (
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-clay-600 hover:bg-clay-100"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                Reply
              </button>
            )}

            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-clay-600 hover:bg-clay-100"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden />
              Report
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete
              </button>
            )}
          </div>

          {replying && (
            <CommentForm
              postId={postId}
              parentId={comment.id}
              placeholder={`Reply to ${comment.author?.full_name ?? 'this comment'}…`}
              onDone={() => setReplying(false)}
              compact
            />
          )}
        </div>
      </div>

      {comment.replies.length > 0 && (
        <ul>
          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              postId={postId}
              viewerId={viewerId}
              viewerIsAdmin={viewerIsAdmin}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={comment.id}
        targetType="comment"
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this comment?"
        description="Replies to it will be removed as well."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteCommentAction(comment.id);
                  if (result.ok) {
                    toast.success('Comment deleted.');
                    setDeleteOpen(false);
                    router.refresh();
                  } else {
                    toast.error(result.message ?? 'That did not work.');
                  }
                })
              }
            >
              Delete
            </Button>
          </>
        }
      />
    </li>
  );
}

export function CommentSection({
  postId,
  comments,
  viewerId,
  viewerIsAdmin,
}: {
  postId: string;
  comments: FeedComment[];
  viewerId: string;
  viewerIsAdmin: boolean;
}) {
  const total = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  return (
    <section id="comments" className="scroll-mt-24 rounded-2xl border border-clay-200 bg-cream-50 p-4 shadow-card sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-clay-900">
        {total === 0 ? 'Comments' : `${total} comment${total === 1 ? '' : 's'}`}
      </h2>

      <CommentForm postId={postId} placeholder="Add a comment…" />

      {comments.length > 0 && (
        <ul className="mt-4 divide-y divide-clay-200 border-t border-clay-200">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              postId={postId}
              viewerId={viewerId}
              viewerIsAdmin={viewerIsAdmin}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flag, Heart, MessageCircle, MoreHorizontal, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deletePostAction,
  reportContentAction,
  sharePostAction,
  toggleLikeAction,
} from '@/lib/actions/feed';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField, Input, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Like / comment / share row under a post, plus the owner and report menu. */
export function PostInteractions({
  postId,
  likeCount,
  commentCount,
  shareCount,
  likedByMe,
  canDelete,
  showCommentLink = true,
}: {
  postId: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  canDelete: boolean;
  showCommentLink?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(likedByMe);
  const [count, setCount] = useState(likeCount);
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function like() {
    // Optimistic: the count moves immediately, and reverts if the write fails.
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    startTransition(async () => {
      const result = await toggleLikeAction(postId);
      if (!result.ok) {
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  const actionClass =
    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-clay-600 transition-colors hover:bg-clay-100 hover:text-clay-900';

  return (
    <>
      <div className="flex items-center justify-between border-t border-clay-200 pt-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={like}
            disabled={pending}
            aria-pressed={liked}
            className={cn(actionClass, liked && 'text-red-600 hover:text-red-700')}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} aria-hidden />
            <span>{count}</span>
            <span className="sr-only">likes</span>
          </button>

          {showCommentLink ? (
            <Link href={`/feed/${postId}#comments`} className={actionClass}>
              <MessageCircle className="h-4 w-4" aria-hidden />
              <span>{commentCount}</span>
              <span className="sr-only">comments</span>
            </Link>
          ) : (
            <span className={cn(actionClass, 'cursor-default')}>
              <MessageCircle className="h-4 w-4" aria-hidden />
              <span>{commentCount}</span>
            </span>
          )}

          <button type="button" onClick={() => setShareOpen(true)} className={actionClass}>
            <Share2 className="h-4 w-4" aria-hidden />
            <span>{shareCount}</span>
            <span className="sr-only">shares</span>
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="More actions"
            className="rounded-lg p-1.5 text-clay-500 hover:bg-clay-100 hover:text-clay-800"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-hidden
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-clay-200 bg-cream-50 py-1 shadow-lift">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-clay-700 hover:bg-clay-100"
                >
                  <Flag className="h-4 w-4" aria-hidden />
                  Report post
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Delete post
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} postId={postId} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetId={postId} targetType="post" />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this post?"
        description="The post, its photos and all its comments will be removed. This cannot be undone."
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
                  const result = await deletePostAction(postId);
                  if (result.ok) {
                    toast.success('Post deleted.');
                    setDeleteOpen(false);
                    router.push('/feed');
                    router.refresh();
                  } else {
                    toast.error(result.message ?? 'That did not work.');
                  }
                })
              }
            >
              Delete post
            </Button>
          </>
        }
      />
    </>
  );
}

function ShareModal({ open, onClose, postId }: { open: boolean; onClose: () => void; postId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share with the community"
      description="This puts the post back at the top of the feed with your note above it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await sharePostAction(postId, note);
                if (result.ok) {
                  toast.success(result.message ?? 'Shared.');
                  setNote('');
                  onClose();
                  router.refresh();
                } else {
                  toast.error(result.message ?? 'That did not work.');
                }
              })
            }
          >
            Share
          </Button>
        </>
      }
    >
      <FormField label="Add a note" htmlFor="share-note" help="Optional.">
        <Textarea
          id="share-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Worth reading…"
        />
      </FormField>
    </Modal>
  );
}

export function ReportModal({
  open,
  onClose,
  targetId,
  targetType,
}: {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'post' | 'comment' | 'profile';
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    if (reason.trim().length < 3) {
      toast.error('Tell us briefly what is wrong.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('target_type', targetType);
      formData.set('target_id', targetId);
      formData.set('reason', reason);
      formData.set('details', details);

      const result = await reportContentAction({ ok: false }, formData);
      if (result.ok) {
        toast.success(result.message ?? 'Reported.');
        setReason('');
        setDetails('');
        onClose();
      } else {
        toast.error(result.message ?? result.errors?.reason?.[0] ?? 'That did not work.');
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report this content"
      description="An administrator will review it. Your name is visible to administrators only."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" loading={pending} onClick={submit}>
            Send report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="What is wrong?" htmlFor="report-reason" required>
          <Input
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Spam, offensive, shares private details…"
            maxLength={120}
          />
        </FormField>
        <FormField label="Anything else we should know?" htmlFor="report-details">
          <Textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </FormField>
      </div>
    </Modal>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, Pin, PinOff, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  pinPostAction,
  resolveReportAction,
  setCommentStatusAction,
  setPostStatusAction,
} from '@/lib/actions/moderation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField, Textarea } from '@/components/ui';
import type { ContentStatus, ReportStatus } from '@/types/database';

export function PostModeration({
  postId,
  status,
  isPinned,
}: {
  postId: string;
  status: ContentStatus;
  isPinned: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hideOpen, setHideOpen] = useState(false);
  const [reason, setReason] = useState('');

  function run(promise: Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        toast.success(result.message ?? 'Done');
        setHideOpen(false);
        setReason('');
        router.refresh();
      } else {
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  return (
    <>
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(pinPostAction(postId, !isPinned))}
          title={isPinned ? 'Unpin from the feed' : 'Pin to the top of the feed'}
        >
          {isPinned ? <PinOff className="h-3.5 w-3.5" aria-hidden /> : <Pin className="h-3.5 w-3.5" aria-hidden />}
          <span className="sr-only">{isPinned ? 'Unpin' : 'Pin'}</span>
        </Button>

        {status === 'published' ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-700 hover:bg-red-50"
            disabled={pending}
            onClick={() => setHideOpen(true)}
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
            Hide
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-brand-700 hover:bg-brand-50"
            disabled={pending}
            onClick={() => run(setPostStatusAction(postId, 'published'))}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Restore
          </Button>
        )}
      </div>

      <Modal
        open={hideOpen}
        onClose={() => !pending && setHideOpen(false)}
        title="Hide this post?"
        description="It disappears from the feed but is kept, so the decision can be reversed."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHideOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => run(setPostStatusAction(postId, 'hidden', reason))}
            >
              Hide post
            </Button>
          </>
        }
      >
        <FormField
          label="Reason"
          htmlFor="hide-reason"
          help="Shared with the author so they know what happened."
        >
          <Textarea
            id="hide-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Shares a family's private details…"
          />
        </FormField>
      </Modal>
    </>
  );
}

export function CommentModeration({ commentId, status }: { commentId: string; status: ContentStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: ContentStatus) {
    startTransition(async () => {
      const result = await setCommentStatusAction(commentId, next);
      if (result.ok) {
        toast.success(result.message ?? 'Done');
        router.refresh();
      } else {
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  return status === 'published' ? (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-red-700 hover:bg-red-50"
      disabled={pending}
      onClick={() => set('hidden')}
    >
      <EyeOff className="h-3.5 w-3.5" aria-hidden />
      Hide
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-brand-700 hover:bg-brand-50"
      disabled={pending}
      onClick={() => set('published')}
    >
      <Eye className="h-3.5 w-3.5" aria-hidden />
      Restore
    </Button>
  );
}

export function ReportControls({ reportId, status }: { reportId: string; status: ReportStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState<ReportStatus>('resolved');

  function submit() {
    startTransition(async () => {
      const result = await resolveReportAction(reportId, decision, notes);
      if (result.ok) {
        toast.success(result.message ?? 'Done');
        setOpen(false);
        setNotes('');
        router.refresh();
      } else {
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  if (status === 'resolved' || status === 'dismissed') {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await resolveReportAction(reportId, 'open');
            if (result.ok) router.refresh();
            else toast.error(result.message ?? 'That did not work.');
          })
        }
      >
        Reopen
      </Button>
    );
  }

  return (
    <>
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-brand-700 hover:bg-brand-50"
          onClick={() => {
            setDecision('resolved');
            setOpen(true);
          }}
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Resolve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setDecision('dismissed');
            setOpen(true);
          }}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Dismiss
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={decision === 'resolved' ? 'Resolve this report' : 'Dismiss this report'}
        description="The person who reported it is told the outcome."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button loading={pending} onClick={submit}>
              {decision === 'resolved' ? 'Resolve' : 'Dismiss'}
            </Button>
          </>
        }
      >
        <FormField label="What did you do?" htmlFor="report-notes">
          <Textarea
            id="report-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </FormField>
      </Modal>
    </>
  );
}

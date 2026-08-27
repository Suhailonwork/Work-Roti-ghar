'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { deleteMediaAction, updateMediaAltAction, uploadMediaAction } from '@/lib/actions/cms';
import { FormField, Input } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { Modal } from '@/components/ui/Modal';
import { FormMessage } from '@/components/auth/FormMessage';
import { formatBytes, formatDate } from '@/lib/utils';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export interface MediaRecord {
  id: string;
  url: string | null;
  filename: string;
  alt_text: string | null;
  folder: string;
  size_bytes: number | null;
  created_at: string;
}

export function UploadMediaButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The dialog stays mounted while closed, so a successful upload clears the
  // fields. A rejected one keeps the chosen file — which matters most here,
  // since a file input cannot be refilled programmatically.
  const { state, pending, formProps } = useFormAction(uploadMediaAction, {
    resetOnSuccess: true,
    initialState,
    onSuccess: (result) => {
      toast.success(result.message ?? 'Uploaded.');
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" aria-hidden />
        Upload image
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload an image"
        description="Images here are public — they appear on the website."
      >
        <form {...formProps} className="space-y-4">
          <FormMessage state={state} />

          <FormField
            label="Image file"
            htmlFor="m-file"
            required
            help="JPEG, PNG, WebP, GIF or AVIF, up to 5 MB."
            errors={state.errors?.file}
          >
            <input
              id="m-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              required
              className="block w-full text-sm text-clay-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cream-50 hover:file:bg-brand-800"
            />
          </FormField>

          <FormField
            label="Alt text"
            htmlFor="m-alt"
            help="Describe what the image shows. Screen readers and search engines both use this."
            errors={state.errors?.alt_text}
          >
            <Input id="m-alt" name="alt_text" maxLength={200} placeholder="Volunteers packing ration kits" />
          </FormField>

          <FormField label="Folder" htmlFor="m-folder" help="Used to group images. Optional.">
            <Input id="m-folder" name="folder" defaultValue="general" maxLength={60} />
          </FormField>

          <div className="flex justify-end gap-2 border-t border-clay-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pending={pending} pendingLabel="Uploading…">Upload</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function MediaCard({ item }: { item: MediaRecord }) {
  const router = useRouter();
  const [alt, setAlt] = useState(item.alt_text ?? '');
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty = alt !== (item.alt_text ?? '');

  async function copyUrl() {
    if (!item.url) return;
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy — select the URL manually.');
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-clay-200 bg-cream-50 shadow-card">
      <div className="aspect-[4/3] bg-clay-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url ?? ''} alt={item.alt_text ?? ''} className="h-full w-full object-cover" loading="lazy" />
      </div>

      <div className="space-y-2.5 p-3">
        <div>
          <p className="truncate text-sm font-medium text-clay-900">{item.filename}</p>
          <p className="text-xs text-clay-500">
            {formatBytes(item.size_bytes)} · {item.folder} · {formatDate(item.created_at)}
          </p>
        </div>

        <div>
          <label htmlFor={`alt-${item.id}`} className="mb-1 block text-xs font-medium text-clay-700">
            Alt text
          </label>
          <div className="flex gap-1.5">
            <Input
              id={`alt-${item.id}`}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              maxLength={200}
              className="h-9 text-xs"
              placeholder="Describe this image"
            />
            {dirty && (
              <Button
                type="button"
                size="sm"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await updateMediaAltAction(item.id, alt);
                    if (result.ok) {
                      toast.success('Alt text saved.');
                      router.refresh();
                    } else {
                      toast.error(result.message ?? 'That did not work.');
                    }
                  })
                }
              >
                Save
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 border-t border-clay-200 pt-2">
          <Button type="button" size="sm" variant="ghost" onClick={copyUrl} className="flex-1 justify-start">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-brand-700" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy URL
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-700 hover:bg-red-50"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Delete ${item.filename}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !pending && setConfirmOpen(false)}
        title="Delete this image?"
        description="Any page still using it will show a broken image. This cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteMediaAction(item.id);
                  if (result.ok) {
                    toast.success('Image deleted.');
                    setConfirmOpen(false);
                    router.refresh();
                  } else {
                    toast.error(result.message ?? 'That did not work.');
                  }
                })
              }
            >
              Delete image
            </Button>
          </>
        }
      />
    </li>
  );
}

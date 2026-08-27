'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import { ExternalLink, History, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createPageAction,
  deletePageAction,
  revertToRevisionAction,
  saveSeoAction,
  snapshotPageAction,
  updatePageAction,
} from '@/lib/actions/cms';
import { FormField, Input, Select, Textarea } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { Modal } from '@/components/ui/Modal';
import { FormMessage } from '@/components/auth/FormMessage';
import { AddTrigger, FormModal } from '../FormModal';
import { DeleteButton } from '../DeleteButton';
import { formatDateTime, slugify } from '@/lib/utils';
import type { CmsPage, CmsSeo } from '@/types/database';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

// ---------------------------------------------------------------- new page --
export function NewPageButton() {
  return (
    <FormModal
      action={createPageAction}
      title="Create a page"
      description="It starts as a draft — nothing is public until you publish it."
      trigger={<AddTrigger label="New page" />}
      submitLabel="Create page"
    >
      {(state) => <NewPageFields state={state} />}
    </FormModal>
  );
}

function NewPageFields({ state }: { state: FormState }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <>
      <FormField label="Page title" htmlFor="p-title" required errors={state.errors?.title}>
        <Input
          id="p-title"
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          required
          maxLength={200}
          placeholder="How we work"
        />
      </FormField>

      <FormField
        label="URL"
        htmlFor="p-slug"
        required
        help={`This page will live at workrotighar.com/${slug || 'your-url'}`}
        errors={state.errors?.slug}
      >
        <Input
          id="p-slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          required
          maxLength={80}
          placeholder="how-we-work"
        />
      </FormField>
    </>
  );
}

// ----------------------------------------------------------- page settings --
export function PageSettingsForm({ page }: { page: CmsPage }) {
  const { state, pending, formProps } = useFormAction(updatePageAction, {
    resetOnSuccess: false,
    initialState,
    onSuccess: (result) => toast.success(result.message ?? 'Saved.'),
  });
  const [status, setStatus] = useState(page.status);


  return (
    <form {...formProps} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={page.id} />

      <FormField label="Page title" htmlFor="s-title" required errors={state.errors?.title}>
        <Input id="s-title" name="title" defaultValue={page.title} required maxLength={200} />
      </FormField>

      <FormField
        label="URL slug"
        htmlFor="s-slug"
        required
        help={page.is_home ? 'The homepage is served at / regardless of this slug.' : undefined}
        errors={state.errors?.slug}
      >
        <Input id="s-slug" name="slug" defaultValue={page.slug} required maxLength={80} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Status" htmlFor="s-status" errors={state.errors?.status}>
          <Select
            id="s-status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CmsPage['status'])}
          >
            <option value="draft">Draft — not public</option>
            <option value="published">Published — live</option>
            <option value="scheduled">Scheduled — publish later</option>
            <option value="archived">Archived</option>
          </Select>
        </FormField>

        {status === 'scheduled' && (
          <FormField
            label="Goes live at"
            htmlFor="s-publish-at"
            required
            help="The page appears automatically once this time passes."
            errors={state.errors?.publish_at}
          >
            <Input
              id="s-publish-at"
              name="publish_at"
              type="datetime-local"
              defaultValue={page.publish_at ? page.publish_at.slice(0, 16) : ''}
              required
            />
          </FormField>
        )}
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-clay-200 bg-cream-100 px-4 py-3">
        <input
          type="checkbox"
          name="is_home"
          defaultChecked={page.is_home}
          className="mt-0.5 h-4 w-4 rounded border-clay-300 text-brand-700 focus:ring-brand-500"
        />
        <span>
          <span className="block text-sm font-medium text-clay-900">Use as the homepage</span>
          <span className="block text-xs leading-relaxed text-clay-600">
            This page is served at the root of the site. Only one page can hold this.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2 border-t border-clay-200 pt-4">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          <Save className="h-4 w-4" aria-hidden />
          Save page
        </SubmitButton>

        <Link
          href={`/preview/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-clay-200 bg-cream-50 px-5 text-sm font-medium text-brand-800 shadow-sm hover:bg-cream-200"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Preview
        </Link>

        {page.status === 'published' && (
          <Link
            href={page.is_home ? '/' : `/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-clay-600 hover:text-clay-900"
          >
            View live
          </Link>
        )}

        {!page.is_home && (
          <span className="ml-auto">
            <DeletePageButton id={page.id} title={page.title} />
          </span>
        )}
      </div>
    </form>
  );
}

function DeletePageButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Delete page
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={`Delete "${title}"?`}
        description="The page, all its sections, its SEO settings and its version history are removed permanently."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deletePageAction(id);
                  if (result.ok) {
                    toast.success('Page deleted.');
                    router.push('/admin/website');
                  } else {
                    toast.error(result.message ?? 'That did not work.');
                  }
                })
              }
            >
              Delete page
            </Button>
          </>
        }
      />
    </>
  );
}

// -------------------------------------------------------------------- SEO --
export function SeoForm({ pageId, seo, pageTitle }: { pageId: string; seo: CmsSeo | null; pageTitle: string }) {
  const { state, pending, formProps } = useFormAction(saveSeoAction, {
    resetOnSuccess: false,
    initialState,
    onSuccess: (result) => toast.success(result.message ?? 'Saved.'),
  });
  const [title, setTitle] = useState(seo?.seo_title ?? pageTitle);
  const [description, setDescription] = useState(seo?.meta_description ?? '');


  return (
    <form {...formProps} className="space-y-5">
      <FormMessage state={state} />
      <input type="hidden" name="page_id" value={pageId} />

      {/* A rough preview of how the page will look in a results list. */}
      <div className="rounded-xl border border-clay-200 bg-white px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-clay-500">Search preview</p>
        <p className="text-xs text-brand-800">workrotighar.com › …</p>
        <p className="truncate text-base text-[#1a0dab]">{title || pageTitle}</p>
        <p className="line-clamp-2 text-sm text-clay-600">
          {description || 'Add a meta description so search engines show a useful summary.'}
        </p>
      </div>

      <FormField
        label="SEO title"
        htmlFor="seo-title"
        help={`${title.length}/60 characters is a good length.`}
        errors={state.errors?.seo_title}
      >
        <Input
          id="seo-title"
          name="seo_title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </FormField>

      <FormField
        label="Meta description"
        htmlFor="seo-description"
        help={`${description.length}/160 characters is a good length.`}
        errors={state.errors?.meta_description}
      >
        <Textarea
          id="seo-description"
          name="meta_description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={320}
        />
      </FormField>

      <FormField
        label="Canonical URL"
        htmlFor="seo-canonical"
        help="Leave blank to use this page's own address."
        errors={state.errors?.canonical_url}
      >
        <Input
          id="seo-canonical"
          name="canonical_url"
          type="url"
          defaultValue={seo?.canonical_url ?? ''}
          placeholder="https://workrotighar.com/about"
        />
      </FormField>

      <FormField
        label="Keywords"
        htmlFor="seo-keywords"
        help="Comma separated."
        errors={state.errors?.keywords}
      >
        <Input id="seo-keywords" name="keywords" defaultValue={(seo?.keywords ?? []).join(', ')} maxLength={500} />
      </FormField>

      <fieldset className="space-y-4 rounded-xl border border-clay-200 bg-cream-100/60 p-4">
        <legend className="px-1 text-sm font-semibold text-clay-800">When shared on social media</legend>

        <FormField label="Share title" htmlFor="og-title" errors={state.errors?.og_title}>
          <Input id="og-title" name="og_title" defaultValue={seo?.og_title ?? ''} maxLength={200} />
        </FormField>

        <FormField label="Share description" htmlFor="og-description" errors={state.errors?.og_description}>
          <Textarea
            id="og-description"
            name="og_description"
            rows={2}
            defaultValue={seo?.og_description ?? ''}
            maxLength={320}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Share image"
            htmlFor="og-image"
            help="1200 × 630 works best."
            errors={state.errors?.og_image_url}
          >
            <Input id="og-image" name="og_image_url" defaultValue={seo?.og_image_url ?? ''} maxLength={500} />
          </FormField>

          <FormField
            label="Share image alt text"
            htmlFor="og-image-alt"
            errors={state.errors?.og_image_alt}
          >
            <Input id="og-image-alt" name="og_image_alt" defaultValue={seo?.og_image_alt ?? ''} maxLength={200} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Twitter card" htmlFor="tw-card" errors={state.errors?.twitter_card}>
            <Select id="tw-card" name="twitter_card" defaultValue={seo?.twitter_card ?? 'summary_large_image'}>
              <option value="summary_large_image">Large image</option>
              <option value="summary">Small summary</option>
            </Select>
          </FormField>

          <FormField label="Twitter image" htmlFor="tw-image" errors={state.errors?.twitter_image_url}>
            <Input
              id="tw-image"
              name="twitter_image_url"
              defaultValue={seo?.twitter_image_url ?? ''}
              maxLength={500}
            />
          </FormField>
        </div>

        <FormField label="Twitter title" htmlFor="tw-title" errors={state.errors?.twitter_title}>
          <Input id="tw-title" name="twitter_title" defaultValue={seo?.twitter_title ?? ''} maxLength={200} />
        </FormField>

        <FormField label="Twitter description" htmlFor="tw-description" errors={state.errors?.twitter_description}>
          <Textarea
            id="tw-description"
            name="twitter_description"
            rows={2}
            defaultValue={seo?.twitter_description ?? ''}
            maxLength={320}
          />
        </FormField>
      </fieldset>

      <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <input
          type="checkbox"
          name="no_index"
          defaultChecked={seo?.no_index ?? false}
          className="mt-0.5 h-4 w-4 rounded border-clay-300 text-brand-700 focus:ring-brand-500"
        />
        <span>
          <span className="block text-sm font-medium text-amber-900">Hide from search engines</span>
          <span className="block text-xs leading-relaxed text-amber-800">
            Adds a no-index tag and keeps the page out of the sitemap.
          </span>
        </span>
      </label>

      <div className="border-t border-clay-200 pt-4">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          <Save className="h-4 w-4" aria-hidden />
          Save SEO settings
        </SubmitButton>
      </div>
    </form>
  );
}

// -------------------------------------------------------------- revisions --
export interface RevisionView {
  id: string;
  version: number;
  note: string | null;
  created_at: string;
  author: string | null;
}

export function RevisionsPanel({ pageId, revisions }: { pageId: string; revisions: RevisionView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function snapshot() {
    startTransition(async () => {
      const result = await snapshotPageAction(pageId, 'Saved manually');
      if (result.ok) {
        toast.success(result.message ?? 'Snapshot saved.');
        router.refresh();
      } else {
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-clay-600">
          Save a version before a big change, then roll back to it if you need to.
        </p>
        <Button type="button" size="sm" variant="secondary" loading={pending} onClick={snapshot}>
          <History className="h-4 w-4" aria-hidden />
          Save this version
        </Button>
      </div>

      {revisions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-clay-300 px-4 py-8 text-center text-sm text-clay-500">
          No versions saved yet.
        </p>
      ) : (
        <ul className="divide-y divide-clay-200 rounded-2xl border border-clay-200 bg-cream-50">
          {revisions.map((revision) => (
            <li key={revision.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-clay-900">Version {revision.version}</p>
                <p className="text-xs text-clay-500">
                  {formatDateTime(revision.created_at)}
                  {revision.author && ` · ${revision.author}`}
                  {revision.note && ` · ${revision.note}`}
                </p>
              </div>

              <DeleteButton
                action={() => revertToRevisionAction(revision.id)}
                title={`Revert to version ${revision.version}?`}
                description="The current sections and SEO settings are backed up automatically first, so this can be undone."
                confirmLabel="Revert"
                icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}
                label="Revert"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

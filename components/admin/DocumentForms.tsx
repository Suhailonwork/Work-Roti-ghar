'use client';

import { Trash2 } from 'lucide-react';
import { deleteDocumentAction, uploadDocumentAction } from '@/lib/actions/finance';
import { FormField, Input, Textarea } from '@/components/ui';
import { AddTrigger, FormModal } from './FormModal';
import { DeleteButton } from './DeleteButton';

export function UploadDocumentButton() {
  return (
    <FormModal
      action={uploadDocumentAction}
      title="Upload a document"
      description="Registration papers, receipts, agreements — anything worth keeping together."
      trigger={<AddTrigger label="Upload document" />}
      submitLabel="Upload"
    >
      {(state) => (
        <>
          <FormField label="Title" htmlFor="doc-title" required errors={state.errors?.title}>
            <Input id="doc-title" name="title" required maxLength={200} />
          </FormField>

          <FormField label="Description" htmlFor="doc-description" errors={state.errors?.description}>
            <Textarea id="doc-description" name="description" rows={2} maxLength={1000} />
          </FormField>

          <FormField label="Category" htmlFor="doc-category" errors={state.errors?.category}>
            <Input id="doc-category" name="category" maxLength={80} placeholder="Registration, Receipts, Legal…" />
          </FormField>

          <FormField
            label="File"
            htmlFor="doc-file"
            required
            help="PDF, image, spreadsheet or document, up to 25 MB. Stored privately."
            errors={state.errors?.file}
          >
            <input
              id="doc-file"
              name="file"
              type="file"
              required
              className="block w-full text-sm text-clay-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cream-50 hover:file:bg-brand-800"
            />
          </FormField>

          <label className="flex items-start gap-2.5 rounded-xl border border-clay-200 bg-cream-100 px-4 py-3">
            <input
              type="checkbox"
              name="is_private"
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded border-clay-300 text-brand-700 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-medium text-clay-900">Administrators only</span>
              <span className="block text-xs leading-relaxed text-clay-600">
                Uncheck to let every approved member see this document.
              </span>
            </span>
          </label>
        </>
      )}
    </FormModal>
  );
}

export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  return (
    <DeleteButton
      action={() => deleteDocumentAction(id)}
      title="Delete this document?"
      description={`"${title}" and its file are removed permanently.`}
      icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
    />
  );
}

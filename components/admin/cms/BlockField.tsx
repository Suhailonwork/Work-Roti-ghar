'use client';

import { useState } from 'react';
import { ImageIcon, Plus, X } from 'lucide-react';
import { FormField, Input, Select, Textarea } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { FieldDef } from '@/lib/cms/blocks';

export interface MediaItem {
  id: string;
  url: string | null;
  alt_text: string | null;
  filename: string;
}

/** Picks an image from the media library, or accepts a pasted URL. */
function ImagePicker({
  value,
  onChange,
  library,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  library: MediaItem[];
  id: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/example.jpg or a full URL"
        />
        <Button type="button" variant="secondary" onClick={() => setOpen(true)} className="shrink-0">
          <ImageIcon className="h-4 w-4" aria-hidden />
          Library
        </Button>
      </div>

      {value && (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-16 w-24 rounded-lg border border-clay-200 object-cover"
            onError={(e) => {
              e.currentTarget.style.opacity = '0.25';
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-medium text-red-700 hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Choose an image" size="lg">
        {library.length === 0 ? (
          <p className="py-8 text-center text-sm text-clay-500">
            Nothing in the media library yet. Upload images under Website → Media.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {library.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item.url ?? '');
                    setOpen(false);
                  }}
                  className="group block w-full overflow-hidden rounded-xl border border-clay-200 transition-shadow hover:shadow-lift"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url ?? ''}
                    alt={item.alt_text ?? ''}
                    className="aspect-square w-full object-cover"
                  />
                  <span className="block truncate px-2 py-1.5 text-left text-[11px] text-clay-600">
                    {item.filename}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

/**
 * Renders one editable field from a block definition.
 *
 * Everything here is driven by `lib/cms/blocks.ts`, so adding a field to a block
 * type needs no new component — the editor picks it up automatically.
 */
export function BlockField({
  field,
  value,
  onChange,
  library,
  idPrefix,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
  library: MediaItem[];
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.name}`;

  switch (field.type) {
    case 'textarea':
    case 'richtext':
      return (
        <FormField label={field.label} htmlFor={id} help={field.help} required={field.required}>
          <Textarea
            id={id}
            rows={field.type === 'richtext' ? 6 : 3}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </FormField>
      );

    case 'number':
      return (
        <FormField label={field.label} htmlFor={id} help={field.help} required={field.required}>
          <Input
            id={id}
            type="number"
            value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </FormField>
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-2 py-2 text-sm text-clay-800">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-clay-300 text-brand-700 focus:ring-brand-500"
          />
          {field.label}
        </label>
      );

    case 'select':
      return (
        <FormField label={field.label} htmlFor={id} help={field.help} required={field.required}>
          <Select
            id={id}
            value={typeof value === 'string' ? value : (field.options?.[0]?.value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
      );

    case 'image':
      return (
        <FormField label={field.label} htmlFor={id} help={field.help} required={field.required}>
          <ImagePicker
            id={id}
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
            library={library}
          />
        </FormField>
      );

    case 'link': {
      const link = (value && typeof value === 'object' ? value : {}) as { label?: string; href?: string };
      return (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-clay-800">{field.label}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={link.label ?? ''}
              onChange={(e) => onChange({ ...link, label: e.target.value })}
              placeholder="Button label"
              aria-label={`${field.label} text`}
            />
            <Input
              value={link.href ?? ''}
              onChange={(e) => onChange({ ...link, href: e.target.value })}
              placeholder="/signup"
              aria-label={`${field.label} destination`}
            />
          </div>
          <p className="mt-1.5 text-xs text-clay-500">Leave both blank to hide this button.</p>
        </fieldset>
      );
    }

    case 'repeater': {
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

      return (
        <fieldset className="rounded-xl border border-clay-200 bg-cream-100/60 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <legend className="text-sm font-medium text-clay-800">{field.label}</legend>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange([...rows, {}])}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add {field.itemLabel ?? 'item'}
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="py-3 text-center text-xs text-clay-500">
              No {field.itemLabel ?? 'item'}s yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row, index) => (
                <li key={index} className="rounded-lg border border-clay-200 bg-cream-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-clay-500">
                      {field.itemLabel ?? 'Item'} {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...rows];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          onChange(next);
                        }}
                        aria-label="Move up"
                        className="rounded p-1 text-xs text-clay-500 hover:bg-clay-100 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === rows.length - 1}
                        onClick={() => {
                          const next = [...rows];
                          [next[index], next[index + 1]] = [next[index + 1], next[index]];
                          onChange(next);
                        }}
                        aria-label="Move down"
                        className="rounded p-1 text-xs text-clay-500 hover:bg-clay-100 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(rows.filter((_, i) => i !== index))}
                        aria-label={`Remove ${field.itemLabel ?? 'item'} ${index + 1}`}
                        className="rounded p-1 text-clay-400 hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {field.fields?.map((sub) => (
                      <BlockField
                        key={sub.name}
                        field={sub}
                        value={row[sub.name]}
                        library={library}
                        idPrefix={`${idPrefix}-${field.name}-${index}`}
                        onChange={(next) =>
                          onChange(rows.map((r, i) => (i === index ? { ...r, [sub.name]: next } : r)))
                        }
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      );
    }

    case 'text':
    default:
      return (
        <FormField label={field.label} htmlFor={id} help={field.help} required={field.required}>
          <Input
            id={id}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </FormField>
      );
  }
}

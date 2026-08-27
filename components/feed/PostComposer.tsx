'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { AtSign, ImagePlus, Megaphone, X } from 'lucide-react';
import { createPostAction, searchMembersAction } from '@/lib/actions/feed';
import { Avatar, Textarea } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { FormMessage } from '@/components/auth/FormMessage';
import { cn, formatBytes } from '@/lib/utils';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };
const MAX_FILES = 6;

interface MemberOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

/**
 * The post composer.
 *
 * Mentions are picked from a member search rather than parsed out of free text,
 * so the ids sent to the server are unambiguous — and the server re-validates
 * them against the active member list regardless.
 */
export function PostComposer({
  author,
  canAnnounce,
  autoFocus,
}: {
  author: { full_name: string; avatar_url: string | null };
  canAnnounce: boolean;
  autoFocus?: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [mentions, setMentions] = useState<MemberOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberOption[]>([]);
  const [searching, startSearch] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A rejected post keeps everything: the text, the chosen mentions and the
  // attached files. Files matter most — a file input cannot be refilled from
  // code, so a reset would silently drop them and the person would have to
  // pick every one again. On success the whole composer is emptied instead.
  const { state, pending, formProps } = useFormAction(createPostAction, {
    resetOnSuccess: true,
    initialState,
    onSuccess: () => {
      setFiles([]);
      setMentions([]);
    },
  });

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  useEffect(() => {
    if (!pickerOpen) return;
    const timer = setTimeout(() => {
      startSearch(async () => {
        setResults(await searchMembersAction(query));
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, pickerOpen]);

  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    setFiles((current) => [...current, ...picked].slice(0, MAX_FILES));
    // Let the same file be chosen again after removal.
    event.target.value = '';
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function addMention(member: MemberOption) {
    if (!mentions.some((m) => m.id === member.id)) {
      setMentions((current) => [...current, member]);
      const textarea = textareaRef.current;
      if (textarea) {
        const insertion = `@${member.full_name} `;
        textarea.value = textarea.value ? `${textarea.value.trimEnd()} ${insertion}` : insertion;
        textarea.focus();
      }
    }
    setPickerOpen(false);
    setQuery('');
  }

  return (
    <form {...formProps} className="rounded-2xl border border-clay-200 bg-cream-50 p-4 shadow-card sm:p-5">
      <FormMessage state={state} />

      <div className="flex gap-3">
        <Avatar src={author.avatar_url} name={author.full_name} size={40} className="hidden sm:block" />

        <div className="min-w-0 flex-1 space-y-3">
          <Textarea
            ref={textareaRef}
            name="content"
            rows={4}
            autoFocus={autoFocus}
            placeholder="Share an update from the last round, a thank you, or something the community should know…"
            className="resize-none border-0 bg-transparent px-0 shadow-none focus:ring-0"
            maxLength={10000}
          />

          {/* ------------------------------------------------- mentions */}
          {mentions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mentions.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200"
                >
                  <input type="hidden" name="mention_ids" value={member.id} />
                  @{member.full_name}
                  <button
                    type="button"
                    onClick={() => setMentions((c) => c.filter((m) => m.id !== member.id))}
                    aria-label={`Remove mention of ${member.full_name}`}
                    className="rounded-full p-0.5 hover:bg-brand-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* ---------------------------------------------- media list */}
          {files.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-xl border border-clay-200 bg-clay-100">
                    {file.type.startsWith('video/') ? (
                      <video src={previews[index]} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[index]} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                    className="absolute right-1.5 top-1.5 rounded-full bg-clay-900/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="mt-1 truncate text-[11px] text-clay-500">{formatBytes(file.size)}</p>
                </li>
              ))}
            </ul>
          )}

          {/* ------------------------------------------ mention picker */}
          {pickerOpen && (
            <div className="rounded-xl border border-clay-200 bg-white p-2 shadow-lift">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members…"
                autoFocus
                className="mb-2 h-9 w-full rounded-lg border border-clay-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
              />
              {searching && <p className="px-2 py-1.5 text-xs text-clay-500">Searching…</p>}
              {!searching && results.length === 0 && query && (
                <p className="px-2 py-1.5 text-xs text-clay-500">No members matched.</p>
              )}
              <ul className="max-h-52 overflow-y-auto">
                {results.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => addMention(member)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-clay-100"
                    >
                      <Avatar src={member.avatar_url} name={member.full_name} size={26} />
                      <span className="truncate">{member.full_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ------------------------------------------------- controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-clay-200 pt-3">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                name="media"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
                onChange={addFiles}
                className="hidden"
                id="post-media"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                Photo or video
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPickerOpen((v) => !v)}
                aria-expanded={pickerOpen}
              >
                <AtSign className="h-4 w-4" aria-hidden />
                Mention
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {canAnnounce && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-clay-700">
                  <input
                    type="checkbox"
                    name="is_announcement"
                    className="h-4 w-4 rounded border-clay-300 text-brand-700 focus:ring-brand-500"
                  />
                  <Megaphone className="h-4 w-4 text-saffron-600" aria-hidden />
                  Announcement
                </label>
              )}
              <SubmitButton pending={pending} pendingLabel="Posting…">
                Post
              </SubmitButton>
            </div>
          </div>

          <p className={cn('text-xs text-clay-500', files.length >= MAX_FILES && 'text-amber-700')}>
            Up to {MAX_FILES} files. Images up to 5 MB, videos up to 50 MB. Everything you post here is visible
            to approved members only.
          </p>
        </div>
      </div>
    </form>
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addBlockAction,
  deleteBlockAction,
  reorderBlocksAction,
  updateBlockAction,
} from '@/lib/actions/cms';
import { BLOCK_DEFS, blockLabel, blockSummary, getBlockDef } from '@/lib/cms/blocks';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { BlockField, type MediaItem } from './BlockField';

export interface EditorBlock {
  id: string;
  block_type: string;
  position: number;
  data: Record<string, unknown>;
  is_visible: boolean;
}

/** One block: a drag handle, a summary, and its fields when expanded. */
function SortableBlock({
  block,
  pageId,
  library,
  expanded,
  onToggle,
}: {
  block: EditorBlock;
  pageId: string;
  library: MediaItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [data, setData] = useState<Record<string, unknown>>(block.data ?? {});
  const [visible, setVisible] = useState(block.is_visible);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Re-sync when the server sends a fresh copy (after a save or a revert).
  useEffect(() => {
    setData(block.data ?? {});
    setVisible(block.is_visible);
    setDirty(false);
  }, [block.data, block.is_visible]);

  const def = getBlockDef(block.block_type);

  function update(name: string, value: unknown) {
    setData((current) => ({ ...current, [name]: value }));
    setDirty(true);
  }

  function save(nextVisible = visible) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set(
        'payload',
        JSON.stringify({ id: block.id, page_id: pageId, block_type: block.block_type, data, is_visible: nextVisible }),
      );

      const result = await updateBlockAction({ ok: false }, formData);
      if (result.ok) {
        toast.success('Block saved.');
        setDirty(false);
        router.refresh();
      } else {
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-2xl border bg-cream-50 shadow-card',
        isDragging ? 'z-10 border-brand-400 shadow-lift' : 'border-clay-200',
        !visible && 'opacity-70',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${blockLabel(block.block_type)} block`}
          className="cursor-grab rounded-lg p-1.5 text-clay-400 hover:bg-clay-100 hover:text-clay-700 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-clay-100/60"
        >
          <span className="shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">
            {blockLabel(block.block_type)}
          </span>
          <span className="truncate text-sm text-clay-600">{blockSummary(block.block_type, data)}</span>
          <ChevronDown
            className={cn('ml-auto h-4 w-4 shrink-0 text-clay-400 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !visible;
            setVisible(next);
            save(next);
          }}
          disabled={pending}
          aria-label={visible ? 'Hide this block' : 'Show this block'}
          title={visible ? 'Visible on the page' : 'Hidden from the page'}
          className="rounded-lg p-1.5 text-clay-500 hover:bg-clay-100"
        >
          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label="Delete this block"
          className="rounded-lg p-1.5 text-clay-400 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-clay-200 px-4 py-4">
          {def ? (
            def.fields.map((field) => (
              <BlockField
                key={field.name}
                field={field}
                value={data[field.name]}
                onChange={(next) => update(field.name, next)}
                library={library}
                idPrefix={block.id}
              />
            ))
          ) : (
            <p className="text-sm text-red-700">
              This block type ({block.block_type}) is no longer available. Delete it or restore its definition.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-clay-200 pt-3">
            {dirty && <span className="mr-auto text-xs text-amber-700">Unsaved changes</span>}
            <Button type="button" size="sm" loading={pending} onClick={() => save()} disabled={!dirty && !pending}>
              Save block
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this block?"
        description="It will be removed from the page. You can add a new one at any time."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteBlockAction(block.id);
                  if (result.ok) {
                    toast.success('Block removed.');
                    setConfirmDelete(false);
                    router.refresh();
                  } else {
                    toast.error(result.message ?? 'That did not work.');
                  }
                })
              }
            >
              Delete block
            </Button>
          </>
        }
      />
    </li>
  );
}

/**
 * The page builder.
 *
 * Blocks are reordered by dragging (or with the keyboard — the sortable
 * handles expose arrow-key movement), and the new order is written back
 * immediately so the public page matches what the editor sees.
 */
export function BlockEditor({
  pageId,
  blocks: initialBlocks,
  library,
}: {
  pageId: string;
  blocks: EditorBlock[];
  library: MediaItem[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(next);

    startTransition(async () => {
      const result = await reorderBlocksAction(
        pageId,
        next.map((b) => b.id),
      );
      if (result.ok) {
        router.refresh();
      } else {
        setBlocks(blocks);
        toast.error(result.message ?? 'The new order could not be saved.');
      }
    });
  }

  function addBlock(type: string) {
    startTransition(async () => {
      const result = await addBlockAction(pageId, type);
      if (result.ok) {
        toast.success('Block added.');
        setAddOpen(false);
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
          {blocks.length === 0
            ? 'This page has no sections yet.'
            : `${blocks.length} section${blocks.length === 1 ? '' : 's'} — drag to reorder.`}
        </p>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)} disabled={pending}>
          <Plus className="h-4 w-4" aria-hidden />
          Add section
        </Button>
      </div>

      {blocks.length === 0 ? (
        <EmptyState
          title="Start building"
          description="Add a hero, some body copy, a gallery — whatever this page needs."
          action={
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add the first section
            </Button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2.5">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  pageId={pageId}
                  library={library}
                  expanded={expandedId === block.id}
                  onToggle={() => setExpandedId((current) => (current === block.id ? null : block.id))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a section"
        description="Pick the kind of content you want to add. You can reorder it afterwards."
        size="lg"
      >
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {BLOCK_DEFS.map((def) => (
            <li key={def.type}>
              <button
                type="button"
                onClick={() => addBlock(def.type)}
                disabled={pending}
                className="h-full w-full rounded-xl border border-clay-200 bg-cream-50 p-3.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-60"
              >
                <p className="font-medium text-clay-900">{def.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-clay-600">{def.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

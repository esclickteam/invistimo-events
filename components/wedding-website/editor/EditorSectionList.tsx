"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import { isSectionVisible } from "@/lib/weddingWebsite/editorSchema";
import {
  canHideSection,
  editorSection,
  moveInOrder,
  resolveSectionOrder,
} from "@/lib/weddingWebsite/editorSections";
import { warningsForSection, type EditorWarning } from "@/lib/weddingWebsite/editorWarnings";
import type { WeddingSectionId } from "@/types/weddingWebsite";

/** The list is a single column, so horizontal drift is only noise. */
const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type Props = {
  warnings: EditorWarning[];
  onOpenSettings: (id: string) => void;
};

export default function EditorSectionList({ warnings, onOpenSettings }: Props) {
  const site = useWeddingSite();
  const editor = site?.editor;
  const order = resolveSectionOrder(site?.content);
  const selectedId = site?.editor?.selection?.type === "section" ? site.editor.selection.path : "";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(active.id as WeddingSectionId);
    const to = order.indexOf(over.id as WeddingSectionId);
    editor?.setSectionOrder(moveInOrder(order, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[lockToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1" aria-label="מקטעי האתר">
          {order.map((id, index) => (
            <SectionRow
              key={id}
              id={id}
              index={index}
              total={order.length}
              selected={selectedId === id}
              visible={isSectionVisible(site?.content, id)}
              warningCount={warningsForSection(warnings, id).length}
              onOpenSettings={onOpenSettings}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SectionRow({
  id,
  index,
  total,
  selected,
  visible,
  warningCount,
  onOpenSettings,
}: {
  id: WeddingSectionId;
  index: number;
  total: number;
  selected: boolean;
  visible: boolean;
  warningCount: number;
  onOpenSettings: (id: string) => void;
}) {
  const site = useWeddingSite();
  const editor = site?.editor;
  const meta = editorSection(id);
  const label = meta?.label || id;
  const hidable = canHideSection(id);
  const [menuOpen, setMenuOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative rounded-xl border transition ${
        selected
          ? "border-[#C9A962] bg-[#C9A962]/15"
          : "border-transparent bg-white/[0.05] hover:bg-white/[0.09]"
      } ${isDragging ? "z-10 border-[#C9A962]/60 shadow-[0_12px_30px_rgba(0,0,0,0.45)]" : ""}`}
    >
      <div className="flex items-center gap-1 px-1.5 py-1">
        <button
          type="button"
          aria-label={`שינוי מיקום המקטע ${label}`}
          className="min-h-[32px] w-6 cursor-grab touch-none text-white/30 hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962] active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <span aria-hidden>⋮⋮</span>
        </button>

        <button
          type="button"
          aria-label={visible ? `הסתרת המקטע ${label}` : `הצגת המקטע ${label}`}
          aria-pressed={!visible}
          disabled={!hidable}
          onClick={() => editor?.toggleSection(id, !visible)}
          className={`min-h-[32px] w-7 rounded-lg text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962] disabled:opacity-25 ${
            visible ? "text-white/70 hover:bg-white/10" : "text-[#E8A87C]"
          }`}
        >
          <span aria-hidden>{visible ? "👁" : "🚫"}</span>
        </button>

        <button
          type="button"
          onClick={() => editor?.scrollToSection(id)}
          className="flex min-h-[32px] flex-1 items-center gap-2 rounded-lg px-1 text-right text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962]"
        >
          <span className={visible ? "" : "text-white/45 line-through decoration-white/30"}>
            {label}
          </span>
          {!visible ? (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-black text-white/60">
              מוסתר
            </span>
          ) : null}
          {meta?.dynamic ? (
            <span
              title="חלק מהתוכן מגיע מפרטי האירוע"
              className="rounded-full bg-[#3D8BBA]/25 px-1.5 py-0.5 text-[9px] font-black text-[#9FD2F0]"
            >
              דינמי
            </span>
          ) : null}
          {warningCount > 0 ? (
            <span
              title={`${warningCount} התראות עיצוב`}
              className="rounded-full bg-[#E8A87C]/20 px-1.5 py-0.5 text-[9px] font-black text-[#E8A87C]"
            >
              !{warningCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          aria-label={`פעולות נוספות למקטע ${label}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
          className="min-h-[32px] w-7 rounded-lg text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962]"
        >
          <span aria-hidden>⋯</span>
        </button>
      </div>

      {menuOpen ? (
        <div
          className="absolute left-1 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-white/12 bg-[#211914] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <MenuItem
            label="הגדרות המקטע"
            onClick={() => {
              onOpenSettings(id);
              setMenuOpen(false);
            }}
          />
          {hidable ? (
            <MenuItem
              label={visible ? "הסתרת המקטע" : "הצגת המקטע"}
              onClick={() => {
                editor?.toggleSection(id, !visible);
                setMenuOpen(false);
              }}
            />
          ) : (
            <p className="px-2 py-2 text-[10px] font-semibold leading-4 text-white/35">
              מקטע חובה — לא ניתן להסתיר אותו.
            </p>
          )}
          <MenuItem
            label="העלאה למעלה"
            disabled={index === 0}
            onClick={() => {
              editor?.moveSection(id, -1);
              setMenuOpen(false);
            }}
          />
          <MenuItem
            label="הורדה למטה"
            disabled={index === total - 1}
            onClick={() => {
              editor?.moveSection(id, 1);
              setMenuOpen(false);
            }}
          />
          <MenuItem
            label="איפוס המקטע לעיצוב התבנית"
            tone="danger"
            onClick={() => {
              setMenuOpen(false);
              editor?.confirm({
                title: "איפוס מקטע",
                message: `כל שינויי העיצוב שביצעתם במקטע "${label}" יימחקו. התוכן עצמו יישמר.`,
                confirmLabel: "איפוס המקטע",
                tone: "danger",
                onConfirm: () => editor?.resetSection(id),
              });
            }}
          />
        </div>
      ) : null}
    </li>
  );
}

function MenuItem({
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`block min-h-[34px] w-full rounded-lg px-2 text-right text-[11px] font-bold transition disabled:opacity-30 ${
        tone === "danger"
          ? "text-[#f0a99c] hover:bg-[#e07a6a]/15"
          : "text-white/80 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

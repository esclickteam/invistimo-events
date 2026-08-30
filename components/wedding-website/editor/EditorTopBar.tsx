"use client";

import { EditorButton, EditorGroup } from "./EditorUI";
import type { WeddingEditorDevice } from "@/components/wedding-website/editable/WeddingSiteContext";

export type EditorZoom = 0.5 | 0.75 | 1 | "fit";

export const EDITOR_ZOOM_OPTIONS: Array<{ value: EditorZoom; label: string }> = [
  { value: 0.5, label: "50%" },
  { value: 0.75, label: "75%" },
  { value: 1, label: "100%" },
  { value: "fit", label: "התאמה" },
];

export type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_LABELS: Record<SaveState, string> = {
  idle: "יש שינויים שלא נשמרו",
  saving: "שומר...",
  saved: "נשמר",
  error: "לא הצלחנו לשמור",
};

export default function EditorTopBar({
  siteTitle,
  device,
  onDevice,
  zoom,
  onZoom,
  saveState,
  dirty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  livePath,
  unpublishedCount,
  onPublish,
  sidebarOpen,
  onToggleSidebar,
}: {
  siteTitle: string;
  device: WeddingEditorDevice;
  onDevice: (device: WeddingEditorDevice) => void;
  zoom: EditorZoom;
  onZoom: (zoom: EditorZoom) => void;
  saveState: SaveState;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  livePath: string;
  unpublishedCount: number;
  onPublish: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const saveLabel = saveState === "idle" && !dirty ? SAVE_LABELS.saved : SAVE_LABELS[saveState];

  return (
    <header
      dir="rtl"
      data-ww-chrome="1"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/10 bg-[#16110d] px-3 py-2 text-white"
    >
      <div className="flex min-w-0 items-center gap-2">
        <EditorButton
          label={sidebarOpen ? "הסתרת המקטעים" : "מקטעים"}
          icon={<span aria-hidden>☰</span>}
          onClick={onToggleSidebar}
          tone="outline"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-black text-[#E8D5A8]">עורך אתר החתונה</p>
          <h1 className="truncate text-sm font-black">{siteTitle || "אתר החתונה"}</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <EditorGroup title="תצוגה">
          <EditorButton
            label="מחשב"
            active={device === "desktop"}
            onClick={() => onDevice("desktop")}
            icon={<span aria-hidden>🖥</span>}
          />
          <EditorButton
            label="נייד"
            active={device === "mobile"}
            onClick={() => onDevice("mobile")}
            icon={<span aria-hidden>📱</span>}
          />
          <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
          <label className="sr-only" htmlFor="ww-zoom">
            מרחק תצוגה
          </label>
          <select
            id="ww-zoom"
            value={String(zoom)}
            onChange={(event) => {
              const raw = event.target.value;
              onZoom(raw === "fit" ? "fit" : (Number(raw) as EditorZoom));
            }}
            className="min-h-[36px] rounded-xl bg-transparent px-2 text-xs font-black text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E8D5A8]"
          >
            {EDITOR_ZOOM_OPTIONS.map((option) => (
              <option key={String(option.value)} value={String(option.value)} className="text-black">
                {option.label}
              </option>
            ))}
          </select>
        </EditorGroup>

        <EditorGroup title="עריכה">
          <EditorButton
            iconOnly
            label="ביטול פעולה (Undo)"
            icon={<span aria-hidden>↶</span>}
            disabled={!canUndo}
            onClick={onUndo}
          />
          <EditorButton
            iconOnly
            label="ביצוע מחדש (Redo)"
            icon={<span aria-hidden>↷</span>}
            disabled={!canRedo}
            onClick={onRedo}
          />
        </EditorGroup>

        <EditorGroup title="פרסום">
          <EditorButton label="תצוגה מקדימה" onClick={onPreview} icon={<span aria-hidden>👁</span>} />
          {livePath ? (
            <a
              href={livePath}
              target="_blank"
              rel="noreferrer"
              title="פתיחת הגרסה שפורסמה"
              className="inline-flex min-h-[36px] items-center rounded-xl px-3 text-xs font-black text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D5A8]"
            >
              האתר החי
            </a>
          ) : null}
          <EditorButton
            tone="solid"
            label={unpublishedCount > 0 ? `פרסום ${unpublishedCount} שינויים` : "האתר מעודכן"}
            onClick={onPublish}
            disabled={unpublishedCount === 0}
          />
        </EditorGroup>

        <span
          role="status"
          aria-live="polite"
          className={`text-[11px] font-bold ${
            saveState === "error" ? "text-[#f0a99c]" : "text-white/50"
          }`}
        >
          {saveLabel}
        </span>
      </div>
    </header>
  );
}

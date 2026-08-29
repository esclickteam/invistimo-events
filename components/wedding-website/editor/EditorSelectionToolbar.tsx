"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import type { WeddingSiteSelection } from "@/components/wedding-website/editable/WeddingSiteContext";
import { WEDDING_EDITOR_FONTS, loadWeddingFont } from "@/lib/weddingWebsite/fonts";
import { contrastOn } from "@/lib/weddingWebsite/styles";
import { applyMediaToContent, mediaSlotFromImageUrl, resolveMediaSlot } from "@/lib/weddingWebsite/media";
import { isSectionVisible, SECTION_LABELS } from "@/lib/weddingWebsite/editorSchema";
import type { WeddingMediaSlot, WeddingTextStyle } from "@/types/weddingWebsite";

export default function EditorSelectionToolbar({
  selection,
}: {
  selection: NonNullable<WeddingSiteSelection>;
}) {
  if (selection.type === "text") return <TextToolbar path={selection.path} />;
  if (selection.type === "media") return <MediaToolbar slotId={selection.path} />;
  if (selection.type === "section") return <SectionToolbar id={selection.path} />;
  return null;
}

function ToolbarShell({ children }: { children: ReactNode }) {
  return (
    <div
      dir="rtl"
      className="flex max-w-[min(92vw,720px)] flex-wrap items-center gap-1 rounded-2xl border border-[#eadfce] bg-white/95 p-1.5 text-[#241A14] shadow-[0_18px_50px_rgba(36,26,20,0.18)] backdrop-blur"
    >
      {children}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-xl px-2.5 py-1.5 text-xs font-black ${
        active ? "bg-[#241A14] text-white" : "bg-transparent text-[#5c4632] hover:bg-[#f7f1e8]"
      }`}
    >
      {children}
    </button>
  );
}

function TextToolbar({ path }: { path: string }) {
  const site = useWeddingSite();
  const style = site?.content.styles?.[path] || {};
  const templateColors = site?.template.theme
    ? [
        site.template.theme.accent,
        site.template.theme.text,
        site.template.theme.textMuted,
        site.template.theme.bg,
        "#ffffff",
        "#111111",
      ]
    : [];

  function patch(partial: WeddingTextStyle | null) {
    site?.editor?.updateTextStyle(path, partial);
  }

  return (
    <ToolbarShell>
      <select
        className="rounded-xl bg-[#fbf8f2] px-2 py-1.5 text-xs font-bold"
        value={style.fontFamily || ""}
        onChange={(event) => {
          const family = event.target.value;
          if (family) loadWeddingFont(family);
          patch({ ...style, fontFamily: family || undefined });
        }}
      >
        <option value="">פונט תבנית</option>
        {WEDDING_EDITOR_FONTS.map((font) => (
          <option key={font.id} value={font.family}>
            {font.label}
          </option>
        ))}
      </select>
      <select
        className="rounded-xl bg-[#fbf8f2] px-2 py-1.5 text-xs font-bold"
        value={style.fontSize || ""}
        onChange={(event) => patch({ ...style, fontSize: event.target.value || undefined })}
      >
        <option value="">גודל</option>
        {["14px", "16px", "18px", "22px", "28px", "36px", "48px", "64px"].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <ToolButton
        title="Bold"
        active={String(style.fontWeight) === "700"}
        onClick={() =>
          patch({ ...style, fontWeight: String(style.fontWeight) === "700" ? "400" : "700" })
        }
      >
        B
      </ToolButton>
      <ToolButton
        title="Italic"
        active={style.fontStyle === "italic"}
        onClick={() =>
          patch({ ...style, fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })
        }
      >
        I
      </ToolButton>
      <ColorControl
        colors={templateColors}
        value={style.color || ""}
        onChange={(color) => patch({ ...style, color: color || undefined })}
      />
      {(["right", "center", "left"] as const).map((align) => (
        <ToolButton
          key={align}
          active={style.textAlign === align}
          onClick={() => patch({ ...style, textAlign: align })}
        >
          {align === "right" ? "ימין" : align === "center" ? "מרכז" : "שמאל"}
        </ToolButton>
      ))}
      <select
        className="rounded-xl bg-[#fbf8f2] px-2 py-1.5 text-xs font-bold"
        value={String(style.lineHeight || "")}
        onChange={(event) => patch({ ...style, lineHeight: event.target.value || undefined })}
      >
        <option value="">גובה שורה</option>
        {["1", "1.2", "1.45", "1.7", "2"].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <ToolButton title="איפוס עיצוב" onClick={() => site?.editor?.resetStyle(path)}>
        איפוס
      </ToolButton>
    </ToolbarShell>
  );
}

function MediaToolbar({ slotId }: { slotId: string }) {
  const site = useWeddingSite();
  const fileRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const slot = resolveMediaSlot(slotId, site?.content, site?.template.heroImage || "");

  async function onFile(file?: File | null) {
    if (!file || !site?.editor) return;
    const uploaded = await site.editor.uploadMedia(file);
    site.editor.updateMedia(slotId, uploaded);
  }

  return (
    <div>
      <ToolbarShell>
        <ToolButton onClick={() => fileRef.current?.click()}>החלפה / העלאה</ToolButton>
        <ToolButton onClick={() => setLibraryOpen((value) => !value)}>מדיה קיימת</ToolButton>
        <ToolButton
          active={slot?.type === "video"}
          onClick={() => setVideoOpen((value) => !value)}
        >
          תמונה / וידאו
        </ToolButton>
        <ToolButton
          onClick={() =>
            site?.editor?.updateMedia(slotId, slot ? { ...slot, fit: slot.fit === "contain" ? "cover" : "contain" } : null)
          }
        >
          {slot?.fit === "contain" ? "Fit" : "Crop"}
        </ToolButton>
        <ToolButton onClick={() => site?.editor?.updateMedia(slotId, null)}>מחיקה</ToolButton>
      </ToolbarShell>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        className="hidden"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {libraryOpen ? <MediaLibrary onPick={(item) => site?.editor?.updateMedia(slotId, item)} /> : null}
      {videoOpen && slot ? (
        <VideoSettings
          slot={slot}
          onChange={(next) => site?.editor?.updateMedia(slotId, next)}
        />
      ) : null}
      {slot ? (
        <FocalPad
          slot={slot}
          onChange={(next) => site?.editor?.updateMedia(slotId, next)}
        />
      ) : null}
    </div>
  );
}

function SectionToolbar({ id }: { id: string }) {
  const site = useWeddingSite();
  const visible = isSectionVisible(site?.content, id);
  const label = SECTION_LABELS[id] || id;
  const style = site?.content.sectionStyles?.[id] || {};

  return (
    <ToolbarShell>
      <span className="px-2 text-xs font-black">{label}</span>
      <ToolButton
        onClick={() => site?.editor?.toggleSection(id, !visible)}
      >
        {visible ? "הסתרה" : "הצגה"}
      </ToolButton>
      <ToolButton onClick={() => site?.editor?.moveSection(id, -1)}>למעלה</ToolButton>
      <ToolButton onClick={() => site?.editor?.moveSection(id, 1)}>למטה</ToolButton>
      <ColorControl
        colors={
          site?.template.theme
            ? [site.template.theme.bg, site.template.theme.bgAlt, site.template.theme.accent, "#ffffff"]
            : []
        }
        value={style.backgroundColor || ""}
        onChange={(backgroundColor) => {
          site?.editor?.updateContent((current) => ({
            ...current,
            sectionStyles: {
              ...(current.sectionStyles || {}),
              [id]: { ...(current.sectionStyles?.[id] || {}), backgroundColor: backgroundColor || undefined },
            },
          }));
        }}
      />
    </ToolbarShell>
  );
}

function ColorControl({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value || "#C9A962");
  const recent = useMemo(() => readRecentColors(), [open]);
  const contrast = contrastOn(hex);

  useEffect(() => {
    if (value) setHex(value);
  }, [value]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-black"
      >
        <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: value || "#ddd" }} />
        צבע
      </button>
      {open ? (
        <div className="absolute right-0 top-9 z-10 w-56 rounded-2xl border border-[#eadfce] bg-white p-3 shadow-xl">
          <p className="mb-2 text-[10px] font-black text-[#8A7B69]">צבעי התבנית</p>
          <div className="flex flex-wrap gap-1.5">
            {colors.filter(Boolean).map((color) => (
              <button
                key={color}
                type="button"
                className="h-6 w-6 rounded-full border border-black/10"
                style={{ background: color }}
                onClick={() => {
                  rememberColor(color);
                  onChange(color);
                }}
              />
            ))}
          </div>
          {recent.length ? (
            <>
              <p className="mb-2 mt-3 text-[10px] font-black text-[#8A7B69]">אחרונים</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ background: color }}
                    onClick={() => onChange(color)}
                  />
                ))}
              </div>
            </>
          ) : null}
          <label className="mt-3 block text-[10px] font-black text-[#8A7B69]">
            HEX
            <input
              value={hex}
              onChange={(event) => setHex(event.target.value)}
              onBlur={() => {
                if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
                  rememberColor(hex);
                  onChange(hex);
                }
              }}
              className="mt-1 w-full rounded-xl border border-[#eadfce] px-2 py-1 font-mono text-xs"
            />
          </label>
          <p className="mt-2 text-[10px] font-semibold text-[#8A7B69]">
            Contrast {contrast.ratio}:1 {contrast.safe ? "תקין" : "חלש"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MediaLibrary({ onPick }: { onPick: (slot: WeddingMediaSlot) => void }) {
  const [items, setItems] = useState<WeddingMediaSlot[]>([]);

  useEffect(() => {
    fetch("/api/wedding-website/media", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="mt-2 max-h-56 w-[min(92vw,360px)] overflow-auto rounded-2xl border border-[#eadfce] bg-white p-2 shadow-xl">
      {items.length === 0 ? (
        <p className="p-3 text-xs font-semibold text-[#8A7B69]">אין מדיה שמורה עדיין</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <button
              key={item.src}
              type="button"
              className="overflow-hidden rounded-xl border border-[#eadfce]"
              onClick={() => onPick(item)}
            >
              {item.type === "video" ? (
                <video src={item.src} className="h-16 w-full object-cover" muted />
              ) : (
                <img src={item.src} alt="" className="h-16 w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoSettings({
  slot,
  onChange,
}: {
  slot: WeddingMediaSlot;
  onChange: (slot: WeddingMediaSlot) => void;
}) {
  return (
    <div className="mt-2 w-[min(92vw,320px)] rounded-2xl border border-[#eadfce] bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 font-black">הגדרות וידאו</p>
      <label className="flex items-center justify-between py-1 font-semibold">
        Autoplay
        <input
          type="checkbox"
          checked={Boolean(slot.autoplay)}
          onChange={(event) =>
            onChange({
              ...slot,
              type: "video",
              autoplay: event.target.checked,
              muted: event.target.checked ? true : slot.muted,
            })
          }
        />
      </label>
      <label className="flex items-center justify-between py-1 font-semibold">
        Loop
        <input
          type="checkbox"
          checked={Boolean(slot.loop)}
          onChange={(event) => onChange({ ...slot, loop: event.target.checked, type: "video" })}
        />
      </label>
      <p className="mt-2 text-[10px] text-[#8A7B69]">Autoplay תמיד מושתק לנייד.</p>
    </div>
  );
}

function FocalPad({
  slot,
  onChange,
}: {
  slot: WeddingMediaSlot;
  onChange: (slot: WeddingMediaSlot) => void;
}) {
  const preview = slot.type === "video" ? slot.poster || slot.src : slot.src;
  return (
    <div className="mt-2 w-[min(92vw,280px)] rounded-2xl border border-[#eadfce] bg-white p-3 shadow-xl">
      <p className="mb-2 text-xs font-black">מיקום / זום</p>
      <button
        type="button"
        className="relative h-28 w-full overflow-hidden rounded-xl bg-black"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
          const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
          onChange({ ...slot, position: `${x}% ${y}%` });
        }}
      >
        {slot.type === "video" && !slot.poster ? (
          <video src={slot.src} className="h-full w-full object-cover" style={mediaSlotFromImageUrl(slot.src) && { objectPosition: slot.position }} muted />
        ) : (
          <img src={preview} alt="" className="h-full w-full object-cover" style={{ objectPosition: slot.position }} />
        )}
      </button>
      <input
        type="range"
        min={1}
        max={2.2}
        step={0.05}
        value={slot.zoom || 1}
        className="mt-2 w-full"
        onChange={(event) => onChange({ ...slot, zoom: Number(event.target.value) })}
      />
    </div>
  );
}

function readRecentColors() {
  try {
    const raw = JSON.parse(sessionStorage.getItem("ww-recent-colors") || "[]");
    return Array.isArray(raw) ? raw.filter((item) => typeof item === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function rememberColor(color: string) {
  const next = [color, ...readRecentColors().filter((item) => item !== color)].slice(0, 8);
  sessionStorage.setItem("ww-recent-colors", JSON.stringify(next));
}

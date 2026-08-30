"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import type { WeddingSiteSelection } from "@/components/wedding-website/editable/WeddingSiteContext";
import { WEDDING_EDITOR_FONTS, loadWeddingFont } from "@/lib/weddingWebsite/fonts";
import { contrastOn } from "@/lib/weddingWebsite/styles";
import {
  isWeddingVideoUrl,
  mediaSlotFromImageUrl,
  resolveMediaSlot,
} from "@/lib/weddingWebsite/media";
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
  return <MediaReplaceControls slotId={slotId} showFit />;
}

function MediaReplaceControls({
  slotId,
  showFit = false,
}: {
  slotId: string;
  showFit?: boolean;
}) {
  const site = useWeddingSite();
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
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
        <ToolButton title="העלאת תמונה" onClick={() => imageRef.current?.click()}>
          תמונה
        </ToolButton>
        <ToolButton title="העלאת סרטון" onClick={() => videoRef.current?.click()}>
          סרטון
        </ToolButton>
        <ToolButton onClick={() => setLibraryOpen((value) => !value)}>מדיה קיימת</ToolButton>
        <ToolButton
          active={slot?.type === "video" || videoOpen}
          onClick={() => setVideoOpen((value) => !value)}
        >
          קישור וידאו
        </ToolButton>
        {showFit ? (
          <ToolButton
            onClick={() =>
              site?.editor?.updateMedia(
                slotId,
                slot ? { ...slot, fit: slot.fit === "contain" ? "cover" : "contain" } : null
              )
            }
          >
            {slot?.fit === "contain" ? "Fit" : "Crop"}
          </ToolButton>
        ) : null}
        <ToolButton onClick={() => site?.editor?.updateMedia(slotId, null)}>מחיקה</ToolButton>
      </ToolbarShell>
      <input
        ref={imageRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {libraryOpen ? <MediaLibrary onPick={(item) => site?.editor?.updateMedia(slotId, item)} /> : null}
      {videoOpen ? (
        <VideoSettings
          slot={slot}
          onChange={(next) => site?.editor?.updateMedia(slotId, next)}
        />
      ) : null}
      {showFit && slot ? (
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
    <div>
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
      {id === "hero" ? (
        <div className="mt-1">
          <MediaReplaceControls slotId="hero" />
        </div>
      ) : null}
    </div>
  );
}

const COLOR_SWATCHES = [
  "#111111",
  "#3f3f3f",
  "#6b6b6b",
  "#9a9a9a",
  "#d4d4d4",
  "#ffffff",
  "#7f1d1d",
  "#b91c1c",
  "#ef4444",
  "#fb7185",
  "#c2410c",
  "#f97316",
  "#facc15",
  "#365314",
  "#16a34a",
  "#4ade80",
  "#0f766e",
  "#22d3ee",
  "#1e3a8a",
  "#2563eb",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#C9A962",
  "#8A7560",
  "#3D2518",
  "#E8788A",
  "#3D8BBA",
  "#6B9E78",
  "#B8956B",
];

function toColorInputValue(value: string) {
  const hex = value.trim();
  if (/^#([0-9a-f]{6})$/i.test(hex)) return hex;
  if (/^#([0-9a-f]{3})$/i.test(hex)) {
    const parts = hex.slice(1).split("");
    return `#${parts.map((part) => part + part).join("")}`;
  }
  return "#C9A962";
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
  const pickerValue = toColorInputValue(hex);
  const palette = Array.from(new Set([...colors.filter(Boolean), ...COLOR_SWATCHES]));

  useEffect(() => {
    if (value) setHex(value);
  }, [value]);

  function applyColor(color: string) {
    setHex(color);
    rememberColor(color);
    onChange(color);
  }

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
        <div className="absolute right-0 top-9 z-10 w-72 rounded-2xl border border-[#eadfce] bg-white p-3 shadow-xl">
          <p className="mb-2 text-[10px] font-black text-[#8A7B69]">פלטת צבעים</p>
          <label className="mb-3 block">
            <span className="sr-only">בחירת צבע</span>
            <input
              type="color"
              value={pickerValue}
              onChange={(event) => applyColor(event.target.value)}
              className="h-12 w-full cursor-pointer rounded-xl border border-[#eadfce] bg-white p-1"
            />
          </label>
          <div className="grid grid-cols-10 gap-1.5">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                className={`h-6 w-6 rounded-full border ${
                  color.toLowerCase() === hex.toLowerCase() ? "border-[#241A14] ring-2 ring-[#C9A962]" : "border-black/10"
                }`}
                style={{ background: color }}
                onClick={() => applyColor(color)}
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
                    onClick={() => applyColor(color)}
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
                  applyColor(hex);
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
  slot: WeddingMediaSlot | null;
  onChange: (slot: WeddingMediaSlot) => void;
}) {
  const current = slot || mediaSlotFromImageUrl("");
  const [url, setUrl] = useState(current.type === "video" ? current.src : "");

  return (
    <div className="mt-2 w-[min(92vw,320px)] rounded-2xl border border-[#eadfce] bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 font-black">סרטון לרקע</p>
      <label className="block font-semibold">
        קישור לסרטון
        <input
          type="url"
          value={url}
          placeholder="https://..."
          onChange={(event) => setUrl(event.target.value)}
          onBlur={() => {
            const next = eventUrl(url);
            if (!next) return;
            onChange({
              ...current,
              type: isWeddingVideoUrl(next) ? "video" : "image",
              src: next,
              autoplay: isWeddingVideoUrl(next),
              muted: true,
              loop: isWeddingVideoUrl(next),
            });
          }}
          className="mt-1 w-full rounded-xl border border-[#eadfce] px-2 py-1.5 font-mono text-[11px]"
        />
      </label>
      <label className="mt-2 flex items-center justify-between py-1 font-semibold">
        Autoplay
        <input
          type="checkbox"
          checked={Boolean(current.autoplay)}
          onChange={(event) =>
            onChange({
              ...current,
              type: "video",
              autoplay: event.target.checked,
              muted: event.target.checked ? true : current.muted,
            })
          }
        />
      </label>
      <label className="flex items-center justify-between py-1 font-semibold">
        Loop
        <input
          type="checkbox"
          checked={Boolean(current.loop)}
          onChange={(event) => onChange({ ...current, loop: event.target.checked, type: "video" })}
        />
      </label>
      <p className="mt-2 text-[10px] text-[#8A7B69]">Autoplay תמיד מושתק לנייד. אפשר גם להעלות קובץ MP4.</p>
    </div>
  );
}

function eventUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  if (!isWeddingVideoUrl(url) && !/^https:\/\//i.test(url)) return "";
  return url;
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

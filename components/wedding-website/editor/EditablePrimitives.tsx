"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { WW_IMAGES } from "@/config/weddingWebsite/media";
import type { WeddingSiteContent, WeddingThemeOverrides } from "@/types/weddingWebsite";
import { useWeddingSite } from "../shared/WeddingSiteContext";
import type { BlockTone } from "../shared/FullLengthBlocks";

export type WeddingEditSelection =
  | { kind: "text"; field: keyof WeddingSiteContent }
  | { kind: "image"; field: "heroImageUrl" | "galleryUrls"; index?: number }
  | { kind: "section"; id: string }
  | { kind: "color"; key: keyof WeddingThemeOverrides }
  | null;

export type WeddingEditApi = {
  enabled: boolean;
  selected: WeddingEditSelection;
  setSelected: (next: WeddingEditSelection) => void;
  updateField: <K extends keyof WeddingSiteContent>(
    key: K,
    value: WeddingSiteContent[K]
  ) => void;
  updateTheme: <K extends keyof WeddingThemeOverrides>(
    key: K,
    value: WeddingThemeOverrides[K]
  ) => void;
  openImagePicker: (field: "heroImageUrl" | "galleryUrls", index?: number) => void;
};

export function useWeddingEdit(): WeddingEditApi | null {
  return useWeddingSite().edit || null;
}

/** Merge template tone defaults with live themeOverrides so colors actually apply. */
export function useResolvedTone(base: BlockTone): BlockTone {
  const { themeOverrides } = useWeddingSite();
  const accent = themeOverrides.accent || base.accent;
  const surface = themeOverrides.card || base.surface;
  const muted = themeOverrides.text
    ? soften(themeOverrides.text, 0.55)
    : base.muted;
  return {
    ...base,
    accent,
    muted,
    surface,
    border: themeOverrides.accent
      ? `${accent}55`
      : base.border || `${accent}55`,
    // Keep template button classes; accent/muted/surface drive inline styles in blocks.
    buttonClass: base.buttonClass,
    outlineButtonClass: base.outlineButtonClass,
  };
}

function soften(hex: string, amount: number) {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return hex;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function EditableText({
  field,
  as = "span",
  className = "",
  style,
  multiline = false,
  children,
  placeholder = "לחצו לעריכה",
}: {
  field: keyof WeddingSiteContent;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  children?: ReactNode;
  placeholder?: string;
}) {
  const edit = useWeddingEdit();
  const content = useWeddingSite().content;
  const Tag = as;
  const raw = content[field];
  const text =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.join("\n")
        : String(children ?? "");
  const elRef = useRef<HTMLElement | null>(null);
  const focusedRef = useRef(false);

  const selected =
    edit?.enabled &&
    edit.selected?.kind === "text" &&
    edit.selected.field === field;

  useEffect(() => {
    const node = elRef.current;
    if (!node || focusedRef.current) return;
    const next = text?.trim() ? text : "";
    if ((node.textContent || "") !== next) {
      node.textContent = next || placeholder;
    }
  }, [text, placeholder, field]);

  if (!edit?.enabled) {
    return (
      <Tag className={className} style={style}>
        {children ?? text}
      </Tag>
    );
  }

  const commitFromDom = (node: HTMLElement) => {
    const next = (node.innerText || "").replace(/\u00a0/g, " ").trimEnd();
    const display = next.trim() ? next : "";
    if (field === "storyParagraphs") {
      edit.updateField(
        "storyParagraphs",
        display
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    } else {
      edit.updateField(field, display as never);
    }
  };

  return (
    <Tag
      ref={elRef as never}
      className={`${className} ww-editable-text ${selected ? "ww-editable-selected" : ""}`}
      style={{
        ...style,
        cursor: "text",
        outline: selected ? "2px solid #B8844F" : undefined,
        outlineOffset: 4,
        borderRadius: 4,
        minHeight: multiline ? 48 : undefined,
        whiteSpace: multiline ? "pre-wrap" : undefined,
      }}
      data-ww-field={String(field)}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => {
        focusedRef.current = true;
        edit.setSelected({ kind: "text", field });
        const node = elRef.current;
        if (node && !(node.textContent || "").trim()) {
          node.textContent = "";
        }
      }}
      onBlur={(e: FocusEvent<HTMLElement>) => {
        focusedRef.current = false;
        commitFromDom(e.currentTarget);
      }}
      onInput={(e: FormEvent<HTMLElement>) => {
        commitFromDom(e.currentTarget);
      }}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        edit.setSelected({ kind: "text", field });
      }}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
          edit.setSelected(null);
        }
      }}
      role="textbox"
      tabIndex={0}
      title="לחצו והקלידו לעריכה"
    />
  );
}

export function EditableImage({
  field = "heroImageUrl",
  index,
  src,
  alt = "",
  className = "",
  style,
}: {
  field?: "heroImageUrl" | "galleryUrls";
  index?: number;
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const edit = useWeddingEdit();
  const selected =
    edit?.enabled &&
    edit.selected?.kind === "image" &&
    edit.selected.field === field &&
    (field === "heroImageUrl" || edit.selected.index === index);

  if (!edit?.enabled) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={`ww-media-fill object-cover ${className}`}
        style={{ objectFit: "cover", ...style }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`group relative block w-full overflow-hidden p-0 ww-media-fill ${className}`}
      style={{
        ...style,
        cursor: "pointer",
        outline: selected ? "3px solid #B8844F" : undefined,
        outlineOffset: 2,
      }}
      data-ww-image={field}
      data-ww-index={typeof index === "number" ? String(index) : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        edit.setSelected({ kind: "image", field, index });
        edit.openImagePicker(field, index);
      }}
      title="לחצו להחלפת תמונה"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="ww-media-fill absolute inset-0 h-full w-full object-cover"
        style={{ height: "100%", width: "100%", objectFit: "cover" }}
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
        <span className="rounded-full bg-white/95 px-4 py-2 text-xs font-black text-[#241A14] opacity-0 shadow group-hover:opacity-100">
          החלפת תמונה
        </span>
      </span>
    </button>
  );
}

export function InlineTextEditor({
  field,
  multiline,
  onClose,
}: {
  field: keyof WeddingSiteContent;
  multiline?: boolean;
  onClose: () => void;
}) {
  const { content } = useWeddingSite();
  const edit = useWeddingEdit();
  const raw = content[field];
  const initial =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? (raw as string[]).join("\n")
        : "";
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    setValue(initial);
    ref.current?.focus();
  }, [field, initial]);

  const applyLive = useCallback(
    (next: string) => {
      if (!edit) return;
      setValue(next);
      if (field === "storyParagraphs") {
        edit.updateField(
          "storyParagraphs",
          next
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        );
      } else {
        edit.updateField(field, next as never);
      }
    },
    [edit, field]
  );

  if (!edit) return null;

  const shared =
    "w-full rounded-xl border border-[#D9B46F] bg-white px-3 py-2.5 text-sm font-semibold text-[#241A14] outline-none";

  return (
    <div className="space-y-2" dir="rtl">
      <p className="text-xs font-black text-[#8A7B69]">עריכת טקסט · {String(field)}</p>
      <p className="text-[11px] font-semibold text-[#8A7B69]">
        השינוי מופיע מיד על האתר. אפשר גם להקליד ישירות על הטקסט בקנבס.
      </p>
      {multiline || field === "storyParagraphs" || field === "invitationText" || field === "welcomeText" ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          className={`${shared} min-h-[120px]`}
          value={value}
          onChange={(e) => applyLive(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          className={shared}
          value={value}
          onChange={(e) => applyLive(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter") onClose();
          }}
        />
      )}
      <button
        type="button"
        onClick={onClose}
        className="rounded-full border border-[#E7DED1] px-4 py-2 text-xs font-bold text-[#8A7B69]"
      >
        סיום
      </button>
    </div>
  );
}

export function ImagePickerPanel({
  field,
  index,
  onClose,
}: {
  field: "heroImageUrl" | "galleryUrls";
  index?: number;
  onClose: () => void;
}) {
  const edit = useWeddingEdit();
  const { content } = useWeddingSite();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!edit) return null;

  const applyUrl = (url: string) => {
    if (field === "heroImageUrl") {
      edit.updateField("heroImageUrl", url);
    } else {
      const gallery = [...(content.galleryUrls || [])];
      const i = typeof index === "number" ? index : 0;
      gallery[i] = url;
      edit.updateField("galleryUrls", gallery);
    }
    onClose();
  };

  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-xs font-black text-[#8A7B69]">
        החלפת תמונה · {field === "heroImageUrl" ? "Hero" : `Gallery #${(index ?? 0) + 1}`}
      </p>
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="w-full rounded-full bg-[#241A14] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
      >
        {uploading ? "מעלה..." : "העלאה מהמחשב"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !edit) return;
          // Parent editor listens via custom event for upload with website id
          setUploading(true);
          try {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(String(reader.result || ""));
              reader.onerror = () => reject(new Error("read failed"));
              reader.readAsDataURL(file);
            });
            window.dispatchEvent(
              new CustomEvent("ww-upload-image", {
                detail: {
                  dataUrl,
                  field,
                  index,
                  onDone: (url: string) => {
                    applyUrl(url);
                    setUploading(false);
                  },
                  onFail: () => setUploading(false),
                },
              })
            );
          } catch {
            setUploading(false);
          }
        }}
      />
      <div className="grid grid-cols-3 gap-2">
        {Object.values(WW_IMAGES).slice(0, 12).map((img) => (
          <button
            key={img}
            type="button"
            onClick={() => applyUrl(img)}
            className="overflow-hidden rounded-lg border border-[#EFE4D6]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-full border border-[#E7DED1] px-4 py-2 text-xs font-bold text-[#8A7B69]"
      >
        סגור
      </button>
    </div>
  );
}

export function ColorEditorPanel({
  themeOverrides,
  defaults,
}: {
  themeOverrides: WeddingThemeOverrides;
  defaults: { accent: string; background: string; text: string; button: string };
}) {
  const edit = useWeddingEdit();
  if (!edit) return null;

  const fields: { key: keyof WeddingThemeOverrides; label: string; fallback: string }[] = [
    { key: "accent", label: "צבע ראשי / הדגשות", fallback: defaults.accent },
    { key: "button", label: "כפתורים", fallback: defaults.button || defaults.accent },
    { key: "background", label: "רקע", fallback: defaults.background },
    { key: "text", label: "טקסט", fallback: defaults.text },
    { key: "secondary", label: "רקע משני", fallback: defaults.background },
    { key: "card", label: "כרטיסים / משטחים", fallback: "#ffffff" },
  ];

  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-xs font-black text-[#8A7B69]">צבעים — משתנים בזמן אמת על האתר</p>
      {fields.map((f) => {
        const value = String(themeOverrides[f.key] || f.fallback || "#ffffff");
        const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
        return (
          <label
            key={String(f.key)}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#EFE4D6] bg-[#FCFAF6] px-3 py-2"
          >
            <span className="text-xs font-black text-[#241A14]">{f.label}</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={hex}
                onInput={(e) =>
                  edit.updateTheme(f.key, (e.target as HTMLInputElement).value)
                }
                onChange={(e) => edit.updateTheme(f.key, e.target.value)}
                className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent"
              />
              <input
                type="text"
                dir="ltr"
                value={value}
                onChange={(e) => edit.updateTheme(f.key, e.target.value)}
                className="w-24 rounded-lg border border-[#E7DED1] bg-white px-2 py-1.5 font-mono text-[11px] font-bold"
              />
            </span>
          </label>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { WeddingThemeOverrides } from "@/types/weddingWebsite";
import { useWeddingEdit, type WeddingEditSelection } from "./EditablePrimitives";

type Props = {
  themeOverrides: WeddingThemeOverrides;
  defaults: { accent: string; background: string; text: string; button: string };
};

function anchorFor(selected: WeddingEditSelection): HTMLElement | null {
  if (!selected || typeof document === "undefined") return null;
  if (selected.kind === "text") {
    return document.querySelector<HTMLElement>(
      `[data-ww-field="${String(selected.field)}"]`
    );
  }
  if (selected.kind === "image") {
    return document.querySelector<HTMLElement>(
      selected.field === "heroImageUrl"
        ? `[data-ww-image="heroImageUrl"], [data-ww-hero="1"]`
        : `[data-ww-image="galleryUrls"][data-ww-index="${selected.index ?? 0}"]`
    );
  }
  if (selected.kind === "section") {
    return document.querySelector<HTMLElement>(
      `[data-ww-section="${selected.id}"]`
    );
  }
  if (selected.kind === "color") {
    return document.querySelector<HTMLElement>(".wedding-website-root");
  }
  return null;
}

export default function EditFloatingToolbar({ themeOverrides, defaults }: Props) {
  const edit = useWeddingEdit();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const selected = edit?.selected ?? null;

  const reposition = () => {
    const el = anchorFor(selected);
    if (!el) {
      setPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const width = 280;
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12
    );
    const top = Math.max(72, rect.top - 8);
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (!edit?.enabled || !selected || !pos) return null;
  // Image replace uses a centered modal — hide the mini toolbar underneath it.
  if (selected.kind === "image") return null;

  const accent = String(themeOverrides.accent || defaults.accent);
  const background = String(themeOverrides.background || defaults.background);
  const text = String(themeOverrides.text || defaults.text);
  const button = String(themeOverrides.button || defaults.button || defaults.accent);

  const title =
    selected.kind === "text"
      ? "עריכת טקסט — הקלידו ישירות על האתר"
      : selected.kind === "image"
        ? "החלפת תמונה"
        : selected.kind === "section"
          ? `סקשן · ${selected.id} — שנו צבע`
          : "צבעים";

  return (
    <div
      className="ww-float-toolbar"
      style={{ top: pos.top, left: pos.left }}
      dir="rtl"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black text-[#241A14]">{title}</p>
        <button
          type="button"
          className="text-[11px] font-bold text-[#8A7B69] hover:text-[#241A14]"
          onClick={() => edit.setSelected(null)}
        >
          סגור
        </button>
      </div>

      {selected.kind === "image" ? (
        <button
          type="button"
          className="mt-2 w-full rounded-full bg-[#241A14] px-3 py-2 text-[11px] font-black text-white"
          onClick={() => edit.openImagePicker(selected.field, selected.index)}
        >
          בחירת / העלאת תמונה
        </button>
      ) : null}

      {selected.kind === "text" ? (
        <p className="mt-1 text-[10px] font-semibold text-[#8A7B69]">
          לחצו על הטקסט באתר והקלידו. השינוי מופיע מיד.
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-2">
        {(
          [
            ["accent", "הדגשה", accent],
            ["background", "רקע", background],
            ["text", "טקסט", text],
            ["button", "כפתור", button],
          ] as const
        ).map(([key, label, value]) => {
          const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
          return (
            <label
              key={key}
              className="flex items-center justify-between gap-1 rounded-lg border border-[#EFE4D6] bg-[#FCFAF6] px-2 py-1.5"
            >
              <span className="text-[10px] font-black text-[#241A14]">{label}</span>
              <input
                type="color"
                value={hex}
                onInput={(e) =>
                  edit.updateTheme(key, (e.target as HTMLInputElement).value)
                }
                onChange={(e) => edit.updateTheme(key, e.target.value)}
                className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"
                title={label}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

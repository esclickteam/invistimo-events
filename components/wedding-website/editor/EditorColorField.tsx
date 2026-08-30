"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import {
  WEDDING_THEME_ROLE_LABELS,
  WEDDING_THEME_ROLE_ORDER,
  resolveWeddingPalette,
  type WeddingThemeRole,
} from "@/lib/weddingWebsite/editorTheme";
import { contrastRatio } from "@/lib/weddingWebsite/styles";

const NEUTRALS = [
  "#FFFFFF",
  "#F5F1EA",
  "#D8D2C8",
  "#9A9186",
  "#5C5449",
  "#241A14",
  "#111111",
  "#000000",
];

const RECENT_KEY = "ww-recent-colors";

export function readRecentColors() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((item) => typeof item === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function rememberColor(color: string) {
  try {
    const next = [color, ...readRecentColors().filter((item) => item !== color)].slice(0, 10);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage can be unavailable; recents are a convenience only
  }
}

function normalizeHex(value: string) {
  const hex = value.trim();
  if (/^#([0-9a-f]{6})$/i.test(hex)) return hex;
  if (/^#([0-9a-f]{3})$/i.test(hex)) {
    return `#${hex
      .slice(1)
      .split("")
      .map((part) => part + part)
      .join("")}`;
  }
  return "";
}

type Props = {
  /** Current value; empty means "inherit from the template". */
  value: string;
  onChange: (value: string) => void;
  /** When present, offers applying the color to the whole theme instead. */
  onApplyToTheme?: (role: WeddingThemeRole, color: string) => void;
  /** Background the color will sit on, used for the contrast hint. */
  against?: string;
  label?: string;
  compact?: boolean;
};

/**
 * Color control that leads with the template's own palette, so a couple picks a
 * colour that already belongs to their design before reaching for a custom hex.
 */
export default function EditorColorField({
  value,
  onChange,
  onApplyToTheme,
  against,
  label = "צבע",
  compact = false,
}: Props) {
  const site = useWeddingSite();
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value || "");
  const [scope, setScope] = useState<"element" | "theme">("element");
  const [pendingRole, setPendingRole] = useState<WeddingThemeRole>("accent");
  const containerRef = useRef<HTMLDivElement>(null);

  const palette = useMemo(
    () => (site ? resolveWeddingPalette(site.template, site.content.theme) : null),
    [site]
  );
  const recent = useMemo(() => (open ? readRecentColors() : []), [open]);

  useEffect(() => setHex(value || ""), [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function apply(color: string) {
    const normalized = normalizeHex(color);
    if (!normalized) return;
    setHex(normalized);
    // Skip the parent write when nothing changed. Blurring the HEX field (or
    // closing the popover) otherwise re-applies the same colour and can loop
    // through updateTheme → re-render → blur.
    if (normalized.toLowerCase() === normalizeHex(value || "").toLowerCase()) return;
    rememberColor(normalized);
    if (scope === "theme" && onApplyToTheme) {
      onApplyToTheme(pendingRole, normalized);
      return;
    }
    onChange(normalized);
  }

  const ratio = against ? contrastRatio(hex || palette?.text, against) : 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex min-h-[36px] items-center gap-2 rounded-xl bg-white px-2.5 text-xs font-black text-[#241A14] hover:bg-[#f7f1e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962] ${
          compact ? "" : "border border-[#eadfce]"
        }`}
      >
        <span
          className="h-4 w-4 rounded-full border border-black/15"
          style={{
            background:
              value ||
              "linear-gradient(135deg,#fff 0 45%,#d8d2c8 45% 55%,#fff 55% 100%)",
          }}
        />
        {compact ? null : <span>{label}</span>}
      </button>

      {open ? (
        <div
          dir="rtl"
          className="absolute right-0 top-11 z-30 w-[288px] rounded-2xl border border-[#eadfce] bg-white p-3 text-[#241A14] shadow-[0_24px_70px_rgba(36,26,20,0.24)]"
        >
          {onApplyToTheme ? (
            <div className="mb-3 rounded-xl bg-[#FBF8F2] p-2">
              <p className="mb-1.5 text-[10px] font-black text-[#8A7B69]">היכן להחיל?</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-pressed={scope === "element"}
                  onClick={() => setScope("element")}
                  className={`min-h-[32px] flex-1 rounded-lg px-2 text-[11px] font-black ${
                    scope === "element" ? "bg-[#241A14] text-white" : "text-[#5c4632]"
                  }`}
                >
                  רק כאן
                </button>
                <button
                  type="button"
                  aria-pressed={scope === "theme"}
                  onClick={() => setScope("theme")}
                  className={`min-h-[32px] flex-1 rounded-lg px-2 text-[11px] font-black ${
                    scope === "theme" ? "bg-[#241A14] text-white" : "text-[#5c4632]"
                  }`}
                >
                  בכל האתר
                </button>
              </div>
              {scope === "theme" ? (
                <select
                  aria-label="תפקיד הצבע בתבנית"
                  value={pendingRole}
                  onChange={(event) => setPendingRole(event.target.value as WeddingThemeRole)}
                  className="mt-2 min-h-[34px] w-full rounded-lg border border-[#eadfce] px-2 text-[11px] font-bold"
                >
                  {WEDDING_THEME_ROLE_ORDER.map((role) => (
                    <option key={role} value={role}>
                      {WEDDING_THEME_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ) : null}

          {palette ? (
            <>
              <p className="mb-2 text-[10px] font-black text-[#8A7B69]">פלטת צבעים של התבנית</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {WEDDING_THEME_ROLE_ORDER.map((role) => {
                  const color = palette[role];
                  if (!/^#/.test(color || "")) return null;
                  return (
                    <button
                      key={role}
                      type="button"
                      title={`${WEDDING_THEME_ROLE_LABELS[role]} · ${color}`}
                      aria-label={`${WEDDING_THEME_ROLE_LABELS[role]} ${color}`}
                      onClick={() => apply(color)}
                      className="h-8 w-8 rounded-xl border border-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962]"
                      style={{ background: color }}
                    />
                  );
                })}
              </div>
            </>
          ) : null}

          {recent.length ? (
            <>
              <p className="mb-2 text-[10px] font-black text-[#8A7B69]">צבעים אחרונים</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {recent.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => apply(color)}
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ background: color }}
                  />
                ))}
              </div>
            </>
          ) : null}

          <p className="mb-2 text-[10px] font-black text-[#8A7B69]">גוונים ניטרליים</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {NEUTRALS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                onClick={() => apply(color)}
                className="h-6 w-6 rounded-full border border-black/10"
                style={{ background: color }}
              />
            ))}
          </div>

          <label className="mb-2 block">
            <span className="text-[10px] font-black text-[#8A7B69]">בחירה חופשית</span>
            <input
              type="color"
              aria-label="בחירת צבע חופשית"
              value={normalizeHex(hex) || "#C9A962"}
              onChange={(event) => apply(event.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-[#eadfce] bg-white p-1"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-black text-[#8A7B69]">HEX</span>
            <input
              value={hex}
              placeholder="#C9A962"
              onChange={(event) => setHex(event.target.value)}
              onBlur={() => apply(hex)}
              onKeyDown={(event) => {
                if (event.key === "Enter") apply(hex);
              }}
              className="mt-1 min-h-[36px] w-full rounded-xl border border-[#eadfce] px-2 font-mono text-xs"
            />
          </label>

          {ratio ? (
            <p className="mt-2 text-[10px] font-bold text-[#8A7B69]">
              ניגודיות {ratio}:1 {ratio >= 4.5 ? "· מעולה" : ratio >= 3 ? "· סבירה" : "· חלשה מדי"}
            </p>
          ) : null}

          {value ? (
            <button
              type="button"
              onClick={() => {
                setHex("");
                onChange("");
                setOpen(false);
              }}
              className="mt-3 min-h-[36px] w-full rounded-xl border border-[#eadfce] text-[11px] font-black text-[#5c4632] hover:bg-[#F7F1E8]"
            >
              חזרה לצבע התבנית
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

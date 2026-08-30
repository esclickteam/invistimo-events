"use client";

import { useRef, useState, type ReactNode } from "react";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import type { WeddingSiteSelection } from "@/components/wedding-website/editable/WeddingSiteContext";
import { WEDDING_EDITOR_FONTS, loadWeddingFont } from "@/lib/weddingWebsite/fonts";
import { isWeddingVideoUrl, resolveMediaSlot } from "@/lib/weddingWebsite/media";
import { isSectionVisible, LOCKED_EVENT_PATHS } from "@/lib/weddingWebsite/editorSchema";
import { canHideSection, editorSectionLabel } from "@/lib/weddingWebsite/editorSections";
import EditorColorField from "./EditorColorField";
import type { WeddingMediaSlot, WeddingTextStyle } from "@/types/weddingWebsite";

export default function EditorSelectionToolbar({
  selection,
}: {
  selection: NonNullable<WeddingSiteSelection>;
}) {
  if (selection.type === "text") return <TextToolbar path={selection.path} />;
  if (selection.type === "media") return <MediaToolbar slotId={selection.path} />;
  if (selection.type === "section" || selection.type === "countdown") {
    return <SectionToolbar id={selection.path} />;
  }
  return null;
}

function ToolbarShell({ children }: { children: ReactNode }) {
  return (
    <div
      dir="rtl"
      className="flex max-w-[min(94vw,760px)] flex-wrap items-center gap-1 rounded-2xl border border-[#eadfce] bg-white/97 p-1.5 text-[#241A14] shadow-[0_18px_50px_rgba(36,26,20,0.22)] backdrop-blur"
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
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[36px] rounded-xl px-2.5 text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C9A962] disabled:opacity-35 ${
        active ? "bg-[#241A14] text-white" : "bg-transparent text-[#5c4632] hover:bg-[#f7f1e8]"
      }`}
    >
      {children}
    </button>
  );
}

function ToolSelect<T extends string>({
  title,
  value,
  onChange,
  children,
}: {
  title: string;
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
}) {
  return (
    <select
      aria-label={title}
      title={title}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="min-h-[36px] rounded-xl bg-[#fbf8f2] px-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962]"
    >
      {children}
    </select>
  );
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px bg-[#eadfce]" aria-hidden />;
}

function DeviceBadge() {
  const site = useWeddingSite();
  if (site?.editor?.device !== "mobile") return null;
  return (
    <span className="rounded-lg bg-[#3D8BBA]/15 px-2 py-1 text-[10px] font-black text-[#2A6E96]">
      עריכה לנייד
    </span>
  );
}

function TextToolbar({ path }: { path: string }) {
  const site = useWeddingSite();
  const editor = site?.editor;
  const mobile = editor?.device === "mobile";
  const desktopStyle = site?.content.styles?.[path] || {};
  const mobileStyle = site?.content.mobileStyles?.[path] || {};
  const style: WeddingTextStyle = mobile ? { ...desktopStyle, ...mobileStyle } : desktopStyle;
  const locked = LOCKED_EVENT_PATHS.has(path);

  function patch(partial: WeddingTextStyle | null) {
    if (!editor) return;
    if (mobile) {
      editor.updateContent((current) => {
        const mobileStyles = { ...(current.mobileStyles || {}) };
        if (!partial) delete mobileStyles[path];
        else mobileStyles[path] = { ...(mobileStyles[path] || {}), ...partial };
        return { ...current, mobileStyles };
      });
      return;
    }
    editor.updateTextStyle(path, partial);
  }

  function reset() {
    if (!editor) return;
    if (mobile) {
      patch(null);
      return;
    }
    editor.resetStyle(path);
  }

  return (
    <div>
      {locked ? (
        <div className="mb-1 flex flex-wrap items-center gap-2 rounded-2xl border border-[#B8D4E6] bg-[#EFF7FC] p-2 text-[11px] font-bold text-[#2A6E96]">
          <span>מידע זה מגיע מפרטי האירוע ולא נשמר בנפרד באתר.</span>
          <a
            href="/dashboard/edit-invitation"
            className="rounded-lg bg-[#2A6E96] px-2 py-1 text-white"
          >
            עריכת פרטי האירוע
          </a>
        </div>
      ) : null}
      <ToolbarShell>
        <DeviceBadge />
        <ToolSelect
          title="פונט"
          value={style.fontFamily || ""}
          onChange={(family) => {
            if (family) loadWeddingFont(family);
            patch({ fontFamily: family || undefined });
          }}
        >
          <option value="">פונט התבנית</option>
          <optgroup label="מותאם לעברית">
            {WEDDING_EDITOR_FONTS.filter((font) => font.rtl).map((font) => (
              <option key={font.id} value={font.family}>
                {font.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="לטיני / דקורטיבי">
            {WEDDING_EDITOR_FONTS.filter((font) => !font.rtl).map((font) => (
              <option key={font.id} value={font.family}>
                {font.label}
              </option>
            ))}
          </optgroup>
        </ToolSelect>

        <ToolSelect
          title="גודל טקסט"
          value={style.fontSize || ""}
          onChange={(fontSize) => patch({ fontSize: fontSize || undefined })}
        >
          <option value="">גודל</option>
          {["12px", "14px", "16px", "18px", "22px", "28px", "36px", "48px", "64px", "80px"].map(
            (size) => (
              <option key={size} value={size}>
                {size}
              </option>
            )
          )}
        </ToolSelect>

        <ToolSelect
          title="עובי"
          value={String(style.fontWeight || "")}
          onChange={(fontWeight) => patch({ fontWeight: fontWeight || undefined })}
        >
          <option value="">עובי</option>
          {["300", "400", "500", "600", "700", "800", "900"].map((weight) => (
            <option key={weight} value={weight}>
              {weight}
            </option>
          ))}
        </ToolSelect>

        <ToolButton
          title="מודגש"
          active={String(style.fontWeight) === "700"}
          onClick={() =>
            patch({ fontWeight: String(style.fontWeight) === "700" ? "400" : "700" })
          }
        >
          B
        </ToolButton>
        <ToolButton
          title="נטוי"
          active={style.fontStyle === "italic"}
          onClick={() => patch({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })}
        >
          <span className="italic">I</span>
        </ToolButton>

        <Divider />

        <EditorColorField
          label="צבע טקסט"
          value={style.color || ""}
          onChange={(color) => patch({ color: color || undefined })}
          onApplyToTheme={(role, color) => editor?.updateTheme({ colors: { [role]: color } })}
        />

        <Divider />

        {(["right", "center", "left"] as const).map((align) => (
          <ToolButton
            key={align}
            title={align === "right" ? "יישור לימין" : align === "center" ? "מרכוז" : "יישור לשמאל"}
            active={style.textAlign === align}
            onClick={() => patch({ textAlign: align })}
          >
            {align === "right" ? "⇥" : align === "center" ? "≡" : "⇤"}
          </ToolButton>
        ))}

        <ToolSelect
          title="גובה שורה"
          value={String(style.lineHeight || "")}
          onChange={(lineHeight) => patch({ lineHeight: lineHeight || undefined })}
        >
          <option value="">גובה שורה</option>
          {["1", "1.15", "1.35", "1.5", "1.7", "2"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </ToolSelect>

        <ToolSelect
          title="מרווח אותיות"
          value={style.letterSpacing || ""}
          onChange={(letterSpacing) => patch({ letterSpacing: letterSpacing || undefined })}
        >
          <option value="">מרווח אותיות</option>
          {["-0.02em", "0em", "0.05em", "0.1em", "0.2em", "0.35em"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </ToolSelect>

        <Divider />

        <ToolButton title="איפוס לעיצוב התבנית" onClick={reset}>
          איפוס
        </ToolButton>
      </ToolbarShell>
    </div>
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
  const editor = site?.editor;
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<"none" | "focal" | "video">("none");
  const [uploading, setUploading] = useState(false);
  const slot = resolveMediaSlot(slotId, site?.content, site?.template.heroImage || "");

  async function onFile(file?: File | null) {
    if (!file || !editor) return;
    setUploading(true);
    try {
      const uploaded = await editor.uploadMedia(file);
      editor.updateMedia(slotId, uploaded);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <ToolbarShell>
        <DeviceBadge />
        <ToolButton title="העלאת תמונה" onClick={() => imageRef.current?.click()} disabled={uploading}>
          {uploading ? "מעלה..." : "תמונה"}
        </ToolButton>
        <ToolButton title="העלאת סרטון" onClick={() => videoRef.current?.click()} disabled={uploading}>
          סרטון
        </ToolButton>
        <ToolButton title="בחירה מספריית המדיה" onClick={() => editor?.pickFromLibrary(slotId)}>
          ספריית מדיה
        </ToolButton>

        <Divider />

        <ToolButton
          title="מיקום, חיתוך וזום"
          active={panel === "focal"}
          onClick={() => setPanel((current) => (current === "focal" ? "none" : "focal"))}
          disabled={!slot?.src}
        >
          מיקום וחיתוך
        </ToolButton>
        {showFit ? (
          <ToolButton
            title={slot?.fit === "contain" ? "מעבר לחיתוך ממלא" : "מעבר להצגת כל התמונה"}
            onClick={() =>
              editor?.updateMedia(
                slotId,
                slot ? { ...slot, fit: slot.fit === "contain" ? "cover" : "contain" } : null
              )
            }
            disabled={!slot?.src}
          >
            {slot?.fit === "contain" ? "התאמה" : "חיתוך"}
          </ToolButton>
        ) : null}
        <ToolButton
          title="הגדרות סרטון"
          active={panel === "video" || slot?.type === "video"}
          onClick={() => setPanel((current) => (current === "video" ? "none" : "video"))}
        >
          וידאו
        </ToolButton>

        <Divider />

        <ToolButton
          title="הסרת המדיה"
          disabled={!slot?.src}
          onClick={() =>
            editor?.confirm({
              title: "הסרת מדיה",
              message: "התמונה או הסרטון יוסרו מהמקטע. הקובץ יישאר בספריית המדיה.",
              confirmLabel: "הסרה",
              tone: "danger",
              onConfirm: () => editor.updateMedia(slotId, null),
            })
          }
        >
          הסרה
        </ToolButton>
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

      {panel === "focal" && slot ? (
        <FocalPad slot={slot} onChange={(next) => editor?.updateMedia(slotId, next)} />
      ) : null}
      {panel === "video" ? (
        <VideoSettings slot={slot} onChange={(next) => editor?.updateMedia(slotId, next)} />
      ) : null}
    </div>
  );
}

function SectionToolbar({ id }: { id: string }) {
  const site = useWeddingSite();
  const editor = site?.editor;
  const visible = isSectionVisible(site?.content, id);
  const label = editorSectionLabel(id);
  const style = site?.content.sectionStyles?.[id] || {};
  const hidable = canHideSection(id);

  return (
    <div>
      <ToolbarShell>
        <span className="px-2 text-xs font-black">{label}</span>
        <DeviceBadge />
        <Divider />
        <ToolButton
          title={visible ? "הסתרת המקטע" : "הצגת המקטע"}
          disabled={!hidable}
          onClick={() => editor?.toggleSection(id, !visible)}
        >
          {visible ? "הסתרה" : "הצגה"}
        </ToolButton>
        <ToolButton title="העלאה למעלה" onClick={() => editor?.moveSection(id, -1)}>
          ↑
        </ToolButton>
        <ToolButton title="הורדה למטה" onClick={() => editor?.moveSection(id, 1)}>
          ↓
        </ToolButton>
        <Divider />
        <EditorColorField
          label="צבע רקע המקטע"
          value={style.backgroundColor || ""}
          against={style.backgroundColor || site?.template.theme.bg}
          onChange={(backgroundColor) =>
            editor?.updateSectionStyle(id, { backgroundColor: backgroundColor || undefined })
          }
          onApplyToTheme={(role, color) => editor?.updateTheme({ colors: { [role]: color } })}
        />
        <ToolButton
          title="איפוס עיצוב המקטע"
          onClick={() =>
            editor?.confirm({
              title: "איפוס מקטע",
              message: `שינויי העיצוב במקטע "${label}" יימחקו. התוכן יישמר.`,
              confirmLabel: "איפוס המקטע",
              tone: "danger",
              onConfirm: () => editor.resetSection(id),
            })
          }
        >
          איפוס מקטע
        </ToolButton>
      </ToolbarShell>
      {id === "hero" ? (
        <div className="mt-1">
          <MediaReplaceControls slotId="hero" showFit />
        </div>
      ) : null}
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
  const current: WeddingMediaSlot =
    slot || { type: "image", src: "", fit: "cover", position: "50% 50%", zoom: 1 };
  const [url, setUrl] = useState(current.type === "video" ? current.src : "");
  const [poster, setPoster] = useState(current.poster || "");

  function applyUrl(value: string) {
    const next = safeMediaUrl(value);
    if (!next) return;
    onChange({
      ...current,
      type: isWeddingVideoUrl(next) ? "video" : "image",
      src: next,
      poster:
        current.poster || (current.type === "image" && current.src ? current.src : undefined),
      autoplay: isWeddingVideoUrl(next),
      muted: true,
      loop: isWeddingVideoUrl(next),
    });
  }

  return (
    <div className="mt-1 w-[min(92vw,340px)] rounded-2xl border border-[#eadfce] bg-white p-3 text-xs shadow-[0_18px_50px_rgba(36,26,20,0.22)]">
      <p className="mb-2 font-black">סרטון</p>
      <label className="block font-semibold">
        קישור לסרטון (mp4 / webm)
        <input
          type="url"
          value={url}
          placeholder="https://..."
          onChange={(event) => setUrl(event.target.value)}
          onBlur={() => applyUrl(url)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            applyUrl(url);
          }}
          className="mt-1 min-h-[36px] w-full rounded-xl border border-[#eadfce] px-2 font-mono text-[11px]"
        />
      </label>

      <label className="mt-2 block font-semibold">
        תמונת פתיחה (Poster)
        <input
          type="url"
          value={poster}
          placeholder="https://..."
          onChange={(event) => setPoster(event.target.value)}
          onBlur={() => {
            const next = safeMediaUrl(poster);
            onChange({ ...current, poster: next || undefined });
          }}
          className="mt-1 min-h-[36px] w-full rounded-xl border border-[#eadfce] px-2 font-mono text-[11px]"
        />
      </label>

      <label className="mt-2 flex min-h-[36px] items-center justify-between font-semibold">
        ניגון אוטומטי
        <input
          type="checkbox"
          checked={Boolean(current.autoplay)}
          onChange={(event) =>
            onChange({
              ...current,
              type: "video",
              autoplay: event.target.checked,
              // Browsers block autoplay with sound, so this stays enforced.
              muted: event.target.checked ? true : current.muted,
            })
          }
          className="h-5 w-5 accent-[#C9A962]"
        />
      </label>
      <label className="flex min-h-[36px] items-center justify-between font-semibold">
        ניגון חוזר
        <input
          type="checkbox"
          checked={Boolean(current.loop)}
          onChange={(event) => onChange({ ...current, loop: event.target.checked, type: "video" })}
          className="h-5 w-5 accent-[#C9A962]"
        />
      </label>
      <label className="flex min-h-[36px] items-center justify-between font-semibold">
        מושתק
        <input
          type="checkbox"
          checked={current.autoplay ? true : Boolean(current.muted)}
          disabled={Boolean(current.autoplay)}
          onChange={(event) => onChange({ ...current, muted: event.target.checked })}
          className="h-5 w-5 accent-[#C9A962]"
        />
      </label>
      <p className="mt-2 text-[10px] font-semibold leading-4 text-[#8A7B69]">
        סרטון שמתנגן אוטומטית נשאר מושתק — כך הוא עובד בכל הדפדפנים ובמובייל.
      </p>
    </div>
  );
}

function safeMediaUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  if (!/^https:\/\//i.test(url)) return "";
  return url;
}

function FocalPad({
  slot,
  onChange,
}: {
  slot: WeddingMediaSlot;
  onChange: (slot: WeddingMediaSlot) => void;
}) {
  const site = useWeddingSite();
  const mobile = site?.editor?.device === "mobile";
  const preview = slot.type === "video" ? slot.poster || slot.src : slot.src;
  const position = (mobile ? slot.positionMobile : slot.position) || slot.position || "50% 50%";
  const [x, y] = position.split(" ");

  function setPosition(next: string) {
    onChange(mobile ? { ...slot, positionMobile: next } : { ...slot, position: next });
  }

  function fromPointer(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const py = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    setPosition(`${Math.min(100, Math.max(0, px))}% ${Math.min(100, Math.max(0, py))}%`);
  }

  return (
    <div className="mt-1 w-[min(92vw,300px)] rounded-2xl border border-[#eadfce] bg-white p-3 shadow-[0_18px_50px_rgba(36,26,20,0.22)]">
      <p className="mb-2 text-xs font-black">
        {mobile ? "נקודת מיקוד לנייד" : "נקודת מיקוד למחשב"}
      </p>
      <div
        role="button"
        tabIndex={0}
        aria-label="בחירת נקודת המיקוד של התמונה"
        className="relative h-28 w-full cursor-crosshair overflow-hidden rounded-xl bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962]"
        onClick={fromPointer}
        onKeyDown={(event) => {
          const step = 5;
          const cx = parseInt(x, 10) || 50;
          const cy = parseInt(y, 10) || 50;
          if (event.key === "ArrowRight") setPosition(`${Math.min(100, cx + step)}% ${cy}%`);
          if (event.key === "ArrowLeft") setPosition(`${Math.max(0, cx - step)}% ${cy}%`);
          if (event.key === "ArrowDown") setPosition(`${cx}% ${Math.min(100, cy + step)}%`);
          if (event.key === "ArrowUp") setPosition(`${cx}% ${Math.max(0, cy - step)}%`);
        }}
      >
        <img
          src={preview}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: position, transform: `scale(${slot.zoom || 1})` }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: x, top: y }}
        />
      </div>
      <div className="mt-2">
        <label className="flex items-center justify-between text-[10px] font-black text-[#8A7B69]">
          זום
          <span>{(slot.zoom || 1).toFixed(2)}×</span>
        </label>
        <input
          type="range"
          aria-label="זום התמונה"
          min={1}
          max={2.2}
          step={0.05}
          value={slot.zoom || 1}
          className="h-9 w-full accent-[#C9A962]"
          onChange={(event) => onChange({ ...slot, zoom: Number(event.target.value) })}
        />
      </div>
      {mobile && slot.positionMobile ? (
        <button
          type="button"
          onClick={() => onChange({ ...slot, positionMobile: undefined })}
          className="mt-1 min-h-[34px] w-full rounded-xl border border-[#eadfce] text-[11px] font-black text-[#5c4632] hover:bg-[#F7F1E8]"
        >
          שימוש באותה נקודה כמו במחשב
        </button>
      ) : null}
    </div>
  );
}

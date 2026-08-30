"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Editor chrome primitives. Every control here is keyboard reachable, labelled
 * for screen readers and sized for touch, so the editor itself is usable and
 * not only the site it produces.
 */

export const EDITOR_CHROME_PROPS = { "data-ww-chrome": "1" } as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  tone?: "ghost" | "solid" | "outline" | "danger";
  label: string;
  /** Hides the text label and relies on the icon plus aria-label. */
  iconOnly?: boolean;
  icon?: ReactNode;
};

const TONES: Record<NonNullable<ButtonProps["tone"]>, string> = {
  ghost: "text-white/75 hover:bg-white/10 hover:text-white",
  solid: "bg-[#C9A962] text-[#1a1410] hover:bg-[#d8bb78]",
  outline: "border border-white/20 text-white hover:bg-white/10",
  danger: "border border-[#e07a6a]/50 text-[#f0a99c] hover:bg-[#e07a6a]/15",
};

export function EditorButton({
  active,
  tone = "ghost",
  label,
  iconOnly,
  icon,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={iconOnly ? label : undefined}
      aria-pressed={active === undefined ? undefined : active}
      className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D5A8] disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-white text-[#1a1410]" : TONES[tone]
      } ${iconOnly ? "w-9 px-0" : ""} ${className}`}
      {...rest}
    >
      {icon}
      {iconOnly ? null : <span>{label}</span>}
    </button>
  );
}

export function EditorGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-white/[0.06] p-1" role="group" aria-label={title}>
      {children}
    </div>
  );
}

export function EditorSegmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-black/20 p-0.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-[32px] flex-1 rounded-[10px] px-2.5 text-[11px] font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C9A962] ${
            value === option.value ? "bg-white text-[#1a1410]" : "text-white/65 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EditorField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black text-white/60">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] font-semibold text-white/40">{hint}</span> : null}
    </label>
  );
}

export function EditorSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  groups,
}: {
  label: string;
  value: T;
  options?: Array<{ value: T; label: string }>;
  groups?: Array<{ label: string; options: Array<{ value: T; label: string }> }>;
  onChange: (value: T) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="min-h-[36px] w-full rounded-xl border border-white/15 bg-[#221a14] px-2 text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C9A962]"
    >
      {options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {groups?.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function EditorSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-black text-white/60">{label}</span>
        <span className="text-[11px] font-bold text-white/45">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-full accent-[#C9A962]"
      />
    </div>
  );
}

export function EditorSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[36px] cursor-pointer items-center justify-between gap-3 text-xs font-bold text-white/80">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#C9A962]"
      />
    </label>
  );
}

export function EditorPanelSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-white/8 px-3 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-wide text-white/45">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** Modal dialog with focus containment and Escape-to-close. */
export function EditorModal({
  title,
  description,
  onClose,
  children,
  footer,
  width = "560px",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button,input,select,a[href]")?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab") return;
      const focusable = ref.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),select,textarea,a[href],[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      dir="rtl"
      data-ww-chrome="1"
      className="ww-editor-ui fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth: width }}
        className="max-h-[88vh] w-full overflow-hidden rounded-[28px] border border-[#EFE4D6] bg-white text-[#241A14] shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#F0E7DA] px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-black">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs font-semibold leading-5 text-[#8A7B69]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="min-h-[36px] min-w-[36px] rounded-xl text-lg font-black text-[#8A7B69] hover:bg-[#F7F1E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962]"
          >
            ×
          </button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[#F0E7DA] bg-[#FBF8F2] px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export function ModalButton({
  tone = "ghost",
  label,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "ghost" | "primary" | "danger"; label: string }) {
  const tones = {
    ghost: "border border-[#E7DED1] bg-white text-[#241A14] hover:bg-[#F7F1E8]",
    primary: "bg-[#C9A962] text-[#1a1410] hover:bg-[#d8bb78]",
    danger: "bg-[#C0503C] text-white hover:bg-[#a94331]",
  } as const;
  return (
    <button
      type="button"
      className={`min-h-[42px] rounded-2xl px-5 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A962] disabled:opacity-50 ${tones[tone]}`}
      {...rest}
    >
      {label}
    </button>
  );
}

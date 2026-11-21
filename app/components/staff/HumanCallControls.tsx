"use client";

export default function HumanCallControls({
  elapsedMs,
  answered,
  canHangup,
  message,
  onFinish,
  disabled = false,
}: {
  elapsedMs: number;
  answered: boolean;
  canHangup: boolean;
  message?: string;
  onFinish: (emergency: boolean) => void;
  disabled?: boolean;
}) {
  const locked = !answered && !canHangup;
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="flex shrink-0 items-center gap-1" dir="rtl">
      <span className="px-2 text-[11px] font-black text-slate-700">{clock}</span>
      {message ? <span className="max-w-[220px] text-[11px] font-bold text-slate-600">{message}</span> : null}
      <button
        type="button"
        onClick={() => onFinish(false)}
        disabled={disabled || locked}
        className="h-9 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
      >
        סיים
      </button>
      {locked ? (
        <button
          type="button"
          onClick={() => onFinish(true)}
          className="h-9 rounded-xl border border-amber-300 bg-amber-50 px-2 text-[11px] font-black text-amber-800"
        >
          ניתוק חירום
        </button>
      ) : null}
    </div>
  );
}

"use client";

import React from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function VenueConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  danger,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-confirm-title"
        className="w-full max-w-md rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-2xl"
      >
        <h2 id="venue-confirm-title" className="text-lg font-black text-[#2b241c]">
          {title}
        </h2>
        <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-11 rounded-2xl border border-[#eadfce] px-4 text-sm font-black text-[#6f6252] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              "h-11 rounded-2xl px-5 text-sm font-black text-white disabled:opacity-60",
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-[#b98121] hover:bg-[#9f6f1a]",
            ].join(" ")}
          >
            {loading ? "מבצע..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

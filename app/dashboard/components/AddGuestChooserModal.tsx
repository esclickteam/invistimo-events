"use client";

import { FileSpreadsheet, UserPlus, X } from "lucide-react";

type Props = {
  onClose: () => void;
  onManual: () => void;
  onExcel: () => void;
};

export default function AddGuestChooserModal({
  onClose,
  onManual,
  onExcel,
}: Props) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1E1B2E]/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-t-[28px] border border-[#EADBC4] bg-[#FFFDF8] p-5 shadow-2xl sm:rounded-[28px]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#3F3328]">הוספת מוזמן</h2>
            <p className="mt-1 text-sm font-bold text-[#7C6A58]">
              בחרו איך להוסיף את המוזמנים
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E3D6C3] bg-white p-2 text-[#5A4635]"
            aria-label="סגור"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onManual}
            className="flex w-full items-center gap-3 rounded-[18px] border border-[#E3D6C3] bg-white px-4 py-4 text-right transition hover:bg-[#FBF7F0]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8EEDB] text-[#B88A2D]">
              <UserPlus size={18} />
            </span>
            <span className="text-base font-black text-[#3F3328]">
              הוספת מוזמן ידנית
            </span>
          </button>

          <button
            type="button"
            onClick={onExcel}
            className="flex w-full items-center gap-3 rounded-[18px] border border-[#E3D6C3] bg-white px-4 py-4 text-right transition hover:bg-[#FBF7F0]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F8EEDB] text-[#B88A2D]">
              <FileSpreadsheet size={18} />
            </span>
            <span className="text-base font-black text-[#3F3328]">
              ייבוא מוזמנים מאקסל
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

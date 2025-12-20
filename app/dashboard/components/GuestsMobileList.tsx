"use client";

import { RSVP_LABELS } from "@/lib/rsvp";

/* ============================================================
   Types
============================================================ */
export type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  relation?: string;
  tableName?: string;
  rsvp: "yes" | "no" | "pending";
  guestsCount: number;
  arrivedCount?: number;
  notes?: string;
};

type Props = {
  guests: Guest[];
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onMessage: (guest: Guest) => void;
  onSeat: (guest: Guest) => void;
};

/* ============================================================
   Helpers
============================================================ */
function StatusBadge({ rsvp }: { rsvp: Guest["rsvp"] }) {
  const styles: Record<Guest["rsvp"], string> = {
    yes: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    no: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[rsvp]}`}
    >
      {RSVP_LABELS[rsvp]}
    </span>
  );
}

/* ============================================================
   Component
============================================================ */
export default function GuestsMobileList({
  guests,
  onEdit,
  onDelete,
  onMessage,
  onSeat,
}: Props) {
  if (!guests || guests.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        לא נמצאו תוצאות
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {guests.map((g) => (
        <div
          key={g._id}
          className="bg-white border rounded-xl px-4 py-3 shadow-sm"
        >
          {/* ================= Header ================= */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-sm leading-tight">
                {g.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {g.phone}
              </div>
            </div>

            <StatusBadge rsvp={g.rsvp} />
          </div>

          {/* ================= Meta ================= */}
          {g.relation && (
            <div className="text-xs text-gray-600 mt-1">
              {g.relation}
            </div>
          )}

          {/* ================= Stats (כמו עמודות) ================= */}
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div className="bg-gray-50 rounded-lg py-2">
              <div className="text-[11px] text-gray-500">
                מוזמנים
              </div>
              <div className="font-semibold text-sm">
                {g.guestsCount}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg py-2">
              <div className="text-[11px] text-gray-500">
                מגיעים
              </div>
              <div className="font-semibold text-sm">
                {g.rsvp === "yes" ? g.guestsCount : 0}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg py-2">
              <div className="text-[11px] text-gray-500">
                שולחן
              </div>
              <div className="font-semibold text-sm">
                {g.tableName || "—"}
              </div>
            </div>
          </div>

          {/* ================= Notes ================= */}
          {g.notes && (
            <div className="text-xs text-gray-600 mt-2">
              {g.notes}
            </div>
          )}

          {/* ================= Actions ================= */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex gap-5 text-lg">
              <button
                onClick={() => onMessage(g)}
                title="שליחת הודעה"
                className="hover:opacity-70"
              >
                💬
              </button>

              <button
                onClick={() => onSeat(g)}
                title="הושבה"
                className="hover:opacity-70"
              >
                🪑
              </button>

              <button
                onClick={() => onEdit(g)}
                title="עריכה"
                className="hover:opacity-70"
              >
                ✏️
              </button>
            </div>

            <button
              onClick={() => onDelete(g)}
              title="מחיקה"
              className="text-red-600 hover:opacity-70 text-lg"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

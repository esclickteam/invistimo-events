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
function rsvpBadgeClass(rsvp: Guest["rsvp"]) {
  if (rsvp === "yes") return "bg-green-100 text-green-700";
  if (rsvp === "no") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
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
    <div className="flex flex-col gap-4">
      {guests.map((g) => (
        <div
          key={g._id}
          className="
            bg-white
            rounded-2xl
            border
            shadow-sm
            p-4
            flex
            flex-col
            gap-3
          "
        >
          {/* ================= Header ================= */}
          <div className="flex items-center justify-between">
            <div className="font-semibold text-lg leading-tight">
              {g.name}
            </div>

            <span
              className={`
                text-xs
                px-3
                py-1
                rounded-full
                font-medium
                ${rsvpBadgeClass(g.rsvp)}
              `}
            >
              {RSVP_LABELS[g.rsvp]}
            </span>
          </div>

          {/* ================= Details ================= */}
          <div className="text-sm text-gray-600 space-y-1">
            <div>📞 {g.phone}</div>
            <div>👥 מוזמנים: {g.guestsCount}</div>

            <div>
              🪑 שולחן:{" "}
              <span className="font-medium text-gray-800">
                {g.tableName || "—"}
              </span>
            </div>

            {g.relation && (
              <div>🤍 {g.relation}</div>
            )}
          </div>

          {/* ================= Actions ================= */}
          <div className="flex justify-between items-center pt-3 border-t">
            <div className="flex gap-4 text-base">
              <button
                onClick={() => onMessage(g)}
                className="text-green-600 font-medium"
              >
                💬
              </button>

              <button
                onClick={() => onSeat(g)}
                className="text-[#8f7a67] font-medium"
              >
                🪑
              </button>

              <button
                onClick={() => onEdit(g)}
                className="text-blue-600 font-medium"
              >
                ✏️
              </button>
            </div>

            <button
              onClick={() => onDelete(g)}
              className="text-red-600 font-medium"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

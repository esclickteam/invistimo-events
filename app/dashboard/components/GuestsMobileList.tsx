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
          className="border rounded-xl p-4 bg-white shadow-sm"
        >
          {/* שם + סטטוס */}
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-lg">{g.name}</div>
            <span className="text-sm text-gray-700">
              {RSVP_LABELS[g.rsvp]}
            </span>
          </div>

          {/* פרטים */}
          <div className="text-sm text-gray-600 space-y-1 mb-3">
            <div>📞 {g.phone}</div>
            <div>👥 מוזמנים: {g.guestsCount}</div>
            <div>
              🪑 שולחן:{" "}
              <span className="font-medium">
                {g.tableName || "—"}
              </span>
            </div>
            {g.relation && <div>🤍 {g.relation}</div>}
          </div>

          {/* פעולות */}
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="flex gap-4 text-lg">
              <button
                onClick={() => onMessage(g)}
                title="שליחת הודעה"
              >
                💬
              </button>
              <button
                onClick={() => onSeat(g)}
                title="הושבה"
              >
                🪑
              </button>
              <button
                onClick={() => onEdit(g)}
                title="עריכה"
              >
                ✏️
              </button>
            </div>

            <button
              onClick={() => onDelete(g)}
              title="מחיקה"
              className="text-red-600"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

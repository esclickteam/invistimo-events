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
  const styles: Record<string, string> = {
    yes: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    no: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[rsvp]}`}
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
    <div className="space-y-2">
      {guests.map((g) => (
        <div
          key={g._id}
          className="bg-white border rounded-lg px-3 py-2"
        >
          {/* שורה 1 – שם + סטטוס */}
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">{g.name}</div>
            <StatusBadge rsvp={g.rsvp} />
          </div>

          {/* שורה 2 – טלפון */}
          <div className="text-xs text-gray-600 mt-1">
            {g.phone}
          </div>

          {/* שורה 3 – נתונים (כמו עמודות) */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-700 mt-2">
            <div>
              <span className="text-gray-500">מוזמנים</span>
              <div className="font-medium">{g.guestsCount}</div>
            </div>

            <div>
              <span className="text-gray-500">מגיעים</span>
              <div className="font-medium">
                {g.rsvp === "yes" ? g.guestsCount : 0}
              </div>
            </div>

            <div>
              <span className="text-gray-500">שולחן</span>
              <div className="font-medium">
                {g.tableName || "—"}
              </div>
            </div>
          </div>

          {/* שורה 4 – הערה / קרבה */}
          {(g.relation || g.notes) && (
            <div className="text-xs text-gray-600 mt-2">
              {g.relation || g.notes}
            </div>
          )}

          {/* פעולות – כמו בעמודת פעולות */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t text-sm">
            <div className="flex gap-4">
              <button onClick={() => onMessage(g)} title="הודעה">
                💬
              </button>
              <button onClick={() => onSeat(g)} title="הושבה">
                🪑
              </button>
              <button onClick={() => onEdit(g)} title="עריכה">
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

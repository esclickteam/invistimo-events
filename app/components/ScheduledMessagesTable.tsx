"use client";

import { useState } from "react";
import EditScheduledMessageModal from "@/app/components/EditScheduledMessageModal";

/* ================= TYPES ================= */

type ScheduledMessageStatus =
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";

type ScheduledMessage = {
  _id: string;
  text: string;
  scheduledAt: string;
  status: ScheduledMessageStatus;
  sentCount?: number;
  guestsCount?: number;
};

/* ================= COMPONENT ================= */

export default function ScheduledMessagesTable({
  messages,
  onChange,
}: {
  messages: ScheduledMessage[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<ScheduledMessage | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  /* ================= ACTIONS ================= */

  async function cancelMessage(id: string) {
    if (!confirm("לבטל את ההודעה המתוזמנת?")) return;

    setLoadingId(id);
    try {
      await fetch(`/api/scheduled-messages/${id}`, {
        method: "DELETE",
      });
      onChange();
    } finally {
      setLoadingId(null);
    }
  }

  /* ================= UI HELPERS ================= */

  const statusLabel: Record<ScheduledMessageStatus, string> = {
    scheduled: "מתוזמנת",
    sending: "בשליחה",
    sent: "נשלחה",
    failed: "נכשלה",
  };

  const statusColor: Record<ScheduledMessageStatus, string> = {
    scheduled: "text-yellow-600",
    sending: "text-blue-600",
    sent: "text-green-600",
    failed: "text-red-600",
  };

  /* ================= RENDER ================= */

  return (
    <>
      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border rounded-xl overflow-hidden text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-right">תוכן ההודעה</th>
              <th className="p-3 text-center">מועד שליחה</th>
              <th className="p-3 text-center">סטטוס</th>
              <th className="p-3 text-center">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {messages.map((msg) => (
              <tr key={msg._id} className="border-t">
                <td className="p-3 text-right max-w-[420px] truncate">
                  {msg.text}
                </td>

                <td className="p-3 text-center">
                  {new Date(msg.scheduledAt).toLocaleString("he-IL")}
                </td>

                <td
                  className={`p-3 text-center font-semibold ${statusColor[msg.status]}`}
                >
                  {statusLabel[msg.status]}
                </td>

                <td className="p-3 text-center">
                  {msg.status === "scheduled" ? (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setEditing(msg)}
                        className="px-3 py-1 rounded bg-blue-500 text-white text-xs"
                      >
                        ✏️ עריכה
                      </button>

                      <button
                        onClick={() => cancelMessage(msg._id)}
                        disabled={loadingId === msg._id}
                        className="px-3 py-1 rounded bg-red-500 text-white text-xs disabled:opacity-50"
                      >
                        ⏸️ ביטול
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE CARDS ================= */}
      <div className="sm:hidden space-y-4">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className="border rounded-xl p-4 bg-white shadow-sm"
          >
            <div className="text-sm font-semibold mb-2">
              תוכן ההודעה
            </div>

            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3">
              {msg.text}
            </div>

            <div className="text-xs text-gray-500 mb-1">
              📅 {new Date(msg.scheduledAt).toLocaleString("he-IL")}
            </div>

            <div
              className={`text-sm font-semibold mb-3 ${statusColor[msg.status]}`}
            >
              {statusLabel[msg.status]}
            </div>

            {msg.status === "scheduled" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(msg)}
                  className="flex-1 py-2 rounded bg-blue-500 text-white text-sm"
                >
                  ✏️ עריכה
                </button>

                <button
                  onClick={() => cancelMessage(msg._id)}
                  disabled={loadingId === msg._id}
                  className="flex-1 py-2 rounded bg-red-500 text-white text-sm disabled:opacity-50"
                >
                  ⏸️ ביטול
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ================= EDIT MODAL ================= */}
      {editing && (
        <EditScheduledMessageModal
          message={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
    </>
  );
}

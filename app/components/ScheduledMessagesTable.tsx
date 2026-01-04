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
      <div className="overflow-x-auto">
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
                {/* TEXT */}
                <td className="p-3 text-right max-w-[420px] truncate">
                  {msg.text}
                </td>

                {/* DATE */}
                <td className="p-3 text-center">
                  {new Date(msg.scheduledAt).toLocaleString("he-IL")}
                </td>

                {/* STATUS */}
                <td
                  className={`p-3 text-center font-semibold ${statusColor[msg.status]}`}
                >
                  {statusLabel[msg.status]}
                </td>

                {/* ACTIONS */}
                <td className="p-3 text-center">
                  {msg.status === "scheduled" ? (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setEditing(msg)}
                        className="px-3 py-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600"
                      >
                        ✏️ עריכה
                      </button>

                      <button
                        onClick={() => cancelMessage(msg._id)}
                        disabled={loadingId === msg._id}
                        className="px-3 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600 disabled:opacity-50"
                      >
                        ❌ ביטול
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

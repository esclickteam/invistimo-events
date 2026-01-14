"use client";

import { useState, useMemo } from "react";
import EditScheduledMessageModal from "@/app/components/EditScheduledMessageModal";

/* ================= TYPES ================= */

type ScheduledMessageStatus =
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";

type MessageTemplateKey = "rsvp" | "table" | "custom";

type ScheduledMessage = {
  _id: string;
  templateKey: MessageTemplateKey;
  filter: "all" | "pending" | "withTable";
  scheduledAt: string;
  status: ScheduledMessageStatus;
  includeGiftLink?: boolean;
  giftLink?: string;
};

/* ================= MESSAGE TEMPLATES ================= */

const MESSAGE_TEMPLATES: Record<MessageTemplateKey, string> = {
  rsvp:
    "היי {{name}},\n" +
    "נשמח לדעת אם תגיעו לחגוג איתנו 🎉\n\n" +
    "לאישור הגעה לחצו כאן:\n" +
    "{{rsvpLink}}\n\n" +
    "מחכים לכם באהבה 💖",

  table:
    "היי {{name}} 🌸 שמחים לראות אותך 💛\n" +
    "מספר השולחן שלך באירוע:\n" +
    "🪑 {{tableName}}\n\n" +
    "ניווט לאירוע:\n" +
    "{{navigationLink}}\n\n" +
    "מחכים לך!",

  custom:
    "היי {{name}} 🌸\n" +
    "שמחנו לראותכם באירוע.\n" +
    "תודה שהשתתפתם בשמחתנו.",
};

/* ================= PREVIEW BUILDER ================= */

function buildSmsPreview(msg: ScheduledMessage) {
  let text = MESSAGE_TEMPLATES[msg.templateKey];

  text = text
    .replace(/{{name}}/g, "שם האורח")
    .replace(/{{rsvpLink}}/g, "https://www.invistimo.com/invite/XXXX")
    .replace(/{{tableName}}/g, "שולחן 1")
    .replace(
      /{{navigationLink}}/g,
      "https://waze.com/ul?ll=32.000000,34.000000&navigate=yes"
    );

  if (msg.includeGiftLink && msg.giftLink) {
    text += `\n\n🎁 למתנה באשראי:\n${msg.giftLink}`;
  }

  return text;
}

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

  async function cancelMessage(id: string) {
    if (!confirm("לבטל את ההודעה המתוזמנת?")) return;

    setLoadingId(id);
    try {
      await fetch(`/api/scheduled-messages/${id}`, { method: "DELETE" });
      onChange();
    } finally {
      setLoadingId(null);
    }
  }

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

  return (
    <>
      {/* ================= DESKTOP ================= */}
      <div className="hidden sm:block overflow-x-auto" dir="rtl">
        <table className="w-full border rounded-xl text-sm table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-right w-[55%]">תוכן ההודעה</th>
              <th className="p-3 text-center w-[20%]">מועד שליחה</th>
              <th className="p-3 text-center w-[12%]">סטטוס</th>
              <th className="p-3 text-center w-[13%]">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {messages.map((msg) => {
              const preview = buildSmsPreview(msg);

              return (
                <tr key={msg._id} className="border-t align-top">
                  <td className="p-3">
                    <div className="whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                      {preview}
                    </div>
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
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
                        >
                          ✏️ עריכה
                        </button>
                        <button
                          onClick={() => cancelMessage(msg._id)}
                          disabled={loadingId === msg._id}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs"
                        >
                          ⏸️ ביטול
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE ================= */}
      <div className="sm:hidden space-y-4">
        {messages.map((msg) => {
          const preview = buildSmsPreview(msg);

          return (
            <div key={msg._id} className="border rounded-xl p-4 bg-white">
              <div className="text-sm font-semibold mb-2">תוכן ההודעה</div>
              <div className="whitespace-pre-wrap text-sm mb-3">{preview}</div>

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
                    className="flex-1 bg-blue-500 text-white py-2 rounded"
                  >
                    ✏️ עריכה
                  </button>
                  <button
                    onClick={() => cancelMessage(msg._id)}
                    className="flex-1 bg-red-500 text-white py-2 rounded"
                  >
                    ⏸️ ביטול
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

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

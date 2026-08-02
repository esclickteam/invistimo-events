"use client";

import { useState } from "react";
import EditScheduledMessageModal from "@/app/components/EditScheduledMessageModal";
import {
  formatScheduleDate,
  formatScheduleTime,
} from "@/lib/formatScheduleDateTime";
import {
  AUTO_REMINDER_BY_TABLE,
  REMINDER_WITH_TABLE_SERVER_TEMPLATE,
  REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE,
} from "@/lib/messages/resolveReminderSmsTemplate";

/* ================= TYPES ================= */

type ScheduledMessageStatus =
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";

type ScheduledMessage = {
  _id: string;

  // ✅ מקור אמת לתצוגה
  messageContent: string;

  messageOverride?: string;
  text?: string;
  type?: string;
  templateKey?: string;
  channel?: string;

  scheduledAt: string;
  status: ScheduledMessageStatus;
};

/* ================= HELPERS ================= */

function formatScheduledAt(iso: string) {
  const date = formatScheduleDate(iso);
  const time = formatScheduleTime(iso);
  if (!date || !time) return "";
  // DD/MM/YYYY HH:mm (24h, no AM/PM), left-to-right
  return `${date} ${time}`;
}

function isReminderMessage(msg: ScheduledMessage) {
  const type = msg.type || msg.templateKey;
  return type === "reminder" || type === "table";
}

function isAutoReminderByTable(msg: ScheduledMessage) {
  const override = String(msg.messageOverride || "").trim();
  const text = String(msg.text || "").trim();
  const content = String(msg.messageContent || "").trim();

  return (
    override === AUTO_REMINDER_BY_TABLE ||
    text === AUTO_REMINDER_BY_TABLE ||
    content === AUTO_REMINDER_BY_TABLE
  );
}

/**
 * לתזכורת AUTO מציגים תבנית עם {{tableName}} גם אם ב-DB נשמרה
 * בטעות/בעבר תבנית בלי שולחן — כדי שהמשתמשת תראה שמספר שולחן חלק מההודעה.
 */
function getDisplayMessageContent(msg: ScheduledMessage) {
  const content = String(msg.messageContent || "").trim();

  if (!isReminderMessage(msg)) {
    return content;
  }

  const auto = isAutoReminderByTable(msg);
  const looksLikeWithoutOnly =
    content === REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE.trim() ||
    (content.includes("{{navigationLink}}") &&
      !content.includes("{{tableName}}") &&
      content.includes("תזכורת לאירוע"));

  if ((auto || looksLikeWithoutOnly) && !content.includes("{{tableName}}")) {
    return REMINDER_WITH_TABLE_SERVER_TEMPLATE;
  }

  return content;
}

function shouldShowTableSendTimeNote(msg: ScheduledMessage) {
  if (!isReminderMessage(msg)) return false;

  const display = getDisplayMessageContent(msg);
  return (
    isAutoReminderByTable(msg) ||
    display.includes("{{tableName}}") ||
    display.includes("מספר השולחן שלך")
  );
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
              const displayContent = getDisplayMessageContent(msg);
              const showTableNote = shouldShowTableSendTimeNote(msg);

              return (
                <tr key={msg._id} className="border-t align-top">
                  <td className="p-3">
                    <div className="whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                      {displayContent}
                    </div>
                    {showTableNote && (
                      <p className="mt-2 text-xs font-bold text-[#8A642B]">
                        מספר שולחן יתווסף ברגע השליחה בפועל — רק לאורחים
                        שיהיה להם מספר באותו רגע. בלי מספר תישלח תזכורת בלבד.
                      </p>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    <span dir="ltr" className="inline-block">
                      {formatScheduledAt(msg.scheduledAt)}
                    </span>
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
                          onClick={() =>
                            setEditing({
                              ...msg,
                              messageContent: displayContent,
                            })
                          }
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
          const displayContent = getDisplayMessageContent(msg);
          const showTableNote = shouldShowTableSendTimeNote(msg);

          return (
            <div key={msg._id} className="border rounded-xl p-4 bg-white">
              <div className="text-sm font-semibold mb-2">תוכן ההודעה</div>

              <div className="whitespace-pre-wrap text-sm mb-2">
                {displayContent}
              </div>

              {showTableNote && (
                <p className="mb-3 text-xs font-bold text-[#8A642B]">
                  מספר שולחן יתווסף ברגע השליחה בפועל — רק לאורחים שיהיה להם
                  מספר באותו רגע. בלי מספר תישלח תזכורת בלבד.
                </p>
              )}

              <div className="text-xs text-gray-500 mb-1">
                📅{" "}
                <span dir="ltr" className="inline-block">
                  {formatScheduledAt(msg.scheduledAt)}
                </span>
              </div>

              <div
                className={`text-sm font-semibold mb-3 ${statusColor[msg.status]}`}
              >
                {statusLabel[msg.status]}
              </div>

              {msg.status === "scheduled" && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setEditing({
                        ...msg,
                        messageContent: displayContent,
                      })
                    }
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

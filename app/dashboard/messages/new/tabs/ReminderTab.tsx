"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import SendButton from "../shared/SendButton";
import {
  ScheduleDateField,
  ScheduleTimeField,
} from "../shared/ScheduleDateTimeFields";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";
import { buildMessage } from "@/lib/messages/buildMessage";
import { useAuth } from "@/context/AuthContext";
import {
  REMINDER_WITH_TABLE_SERVER_TEMPLATE,
  buildReminderSmsTemplateForGuest,
} from "@/lib/messages/resolveReminderSmsTemplate";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
  tableId?: string | null;
  tableName?: string;
  tableNumber?: number;
};

type SeatingTableOption = {
  id: string;
  name: string;
};

type Props = {
  invitationId: string;
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
  lat?: number;
  lng?: number;
  giftCreditUrl?: string;
};

type SendTiming = "now" | "scheduled";

/* ================= TEMPLATES ================= */

const MAX_TEST_MESSAGES = 2;

/* ================= COMPONENT ================= */

export default function ReminderTab({
  invitationId,
  invitationTitle,
  eventDate,
  eventLocation,
  lat,
  lng,
}: Props) {
  const { user } = useAuth();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitation, setInvitation] = useState<any>(null);
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState(REMINDER_WITH_TABLE_SERVER_TEMPLATE);

  const [hideTableNumberForAll, setHideTableNumberForAll] = useState(false);
  const [hideSelectedTables, setHideSelectedTables] = useState(false);
  const [hiddenTableIds, setHiddenTableIds] = useState<string[]>([]);
  const [tables, setTables] = useState<SeatingTableOption[]>([]);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [preview, setPreview] = useState<any>(null);

  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testCount, setTestCount] = useState(0);

  const [reminderSentAt, setReminderSentAt] = useState<Date | null>(null);
  const [reminderLocked, setReminderLocked] = useState(true);

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduled, setShowScheduled] = useState(false);

  const [sendTiming, setSendTiming] = useState<SendTiming>("scheduled");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    if (!invitationId) {
      setGuests([]);
      setInvitation(null);
      setPreview(null);
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);

        const [guestsRes, invitationRes, templateRes] = await Promise.all([
          fetch(`/api/guests?invitation=${invitationId}`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/invitations/${invitationId}`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/admin/reminder-sms-template", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const guestsData = await guestsRes.json();
        const invitationData = await invitationRes.json();
        const templateData = await templateRes.json().catch(() => null);

        const loadedGuests = Array.isArray(guestsData.guests)
          ? guestsData.guests
          : [];

        const inv = invitationData?.invitation || null;
        const event = invitationData?.event || null;

        setGuests(loadedGuests);
        setInvitation(inv);

        const resolvedEventId = String(
          event?._id || event?.id || inv?.eventId || ""
        );
        setEventId(resolvedEventId);

        if (typeof templateData?.reminderSmsBody === "string" && templateData.reminderSmsBody.trim()) {
          setMessage(templateData.reminderSmsBody);
        } else {
          setMessage(REMINDER_WITH_TABLE_SERVER_TEMPLATE);
        }

        setHideTableNumberForAll(Boolean(event?.hideTableNumberForAll));
        const loadedHidden = Array.isArray(event?.hiddenTableIds)
          ? event.hiddenTableIds.map((id: unknown) => String(id || "")).filter(Boolean)
          : [];
        setHiddenTableIds(loadedHidden);
        setHideSelectedTables(loadedHidden.length > 0);

        if (inv?.reminderSentAt) {
          setReminderSentAt(new Date(inv.reminderSentAt));
        } else {
          setReminderSentAt(null);
        }

        setReminderLocked(inv?.messageLocks?.reminderSms ?? true);
      } catch (err) {
        console.error("❌ Failed to load reminder tab data", err);
        setGuests([]);
        setInvitation(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId]);

  /* ================= SCHEDULED ================= */

  const loadScheduledMessages = async () => {
    try {
      const res = await fetch("/api/scheduled-messages", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (data?.success) {
        setScheduledMessages(Array.isArray(data.messages) ? data.messages : []);
      } else {
        setScheduledMessages([]);
      }
    } catch (err) {
      console.error("❌ Failed to load scheduled messages", err);
      setScheduledMessages([]);
    }
  };

  useEffect(() => {
    loadScheduledMessages();
  }, []);

  useEffect(() => {
    if (!eventId) {
      setTables([]);
      return;
    }

    let cancelled = false;

    async function loadTables() {
      try {
        const res = await fetch(
          `/api/seating/tables/${eventId}?invitationId=${encodeURIComponent(invitationId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json();
        if (cancelled) return;

        const loaded = Array.isArray(data?.tables) ? data.tables : [];
        setTables(
          loaded
            .map((table: any) => ({
              id: String(table?.id || table?._id || "").trim(),
              name: String(table?.name || "").trim() || "שולחן",
            }))
            .filter((table: SeatingTableOption) => table.id)
        );
      } catch {
        if (!cancelled) setTables([]);
      }
    }

    loadTables();
    return () => {
      cancelled = true;
    };
  }, [eventId, invitationId]);

  async function persistTableVisibility(next: {
    hideTableNumberForAll?: boolean;
    hiddenTableIds?: string[];
  }) {
    if (!eventId) return;

    try {
      setSavingVisibility(true);
      await fetch(`/api/events/${eventId}/reminder-table-visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.error("❌ Failed to save reminder table visibility", err);
    } finally {
      setSavingVisibility(false);
    }
  }

  const reminderScheduledMessages = useMemo(() => {
    return scheduledMessages.filter((msg) => {
      const type = msg?.type || msg?.messageType;
      const channel = msg?.channel;

      return type === "reminder" && (!channel || channel === "sms");
    });
  }, [scheduledMessages]);

  /* ================= GUESTS ================= */

  const confirmedGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "yes"),
    [guests]
  );

  const pendingGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "pending"),
    [guests]
  );

  const declinedGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "no"),
    [guests]
  );

  const guestsWithTable = useMemo(
    () => confirmedGuests.filter((g) => hasTable(g)),
    [confirmedGuests]
  );

  const guestsToSend = confirmedGuests;

  /* ================= AUTO MESSAGE TYPE ================= */

  const hasSeatingPackage = useMemo(() => {
    return detectSeatingPackage(invitation, guestsWithTable.length);
  }, [invitation, guestsWithTable.length]);

  /* ================= TIMING ================= */

  const scheduledAt = useMemo(() => {
    if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
      return null;
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  const isScheduledMode = sendTiming === "scheduled";

  /* ================= BUILD MESSAGE ================= */

  const buildReminderMessage = (g: Guest) => {
    const built = buildReminderSmsTemplateForGuest({
      body: message,
      event: {
        hideTableNumberForAll,
        hiddenTableIds: hideSelectedTables ? hiddenTableIds : [],
      },
      guest: g,
    });

    return buildMessage({
      template: built.template,
      guest: {
        ...g,
        tableName: built.tableName,
      },
      invitationTitle,
      eventDate,
      eventLocation,
      navigationLink: invitation?.shareId
  ? `https://www.invistimo.com/e/${invitation.shareId}`
  : "",
    });
  };

  /* ================= PREVIEW ================= */

  useEffect(() => {
    if (!invitationId || guestsToSend.length === 0) {
      setPreview(null);
      return;
    }

    const firstGuest =
      hasSeatingPackage && guestsWithTable.length > 0
        ? guestsWithTable[0]
        : guestsToSend[0];

    /**
     * מקור האמת לתצוגה = הטקסט המקומי (כולל מספר שולחן אם יש).
     * השרת משמש רק לאימות אורך/חלקים — לא לדריסת התוכן,
     * כדי למנוע הבהוב שבו מספר השולחן מופיע ואז נעלם
     * בגלל תשובת preview ישנה שמגיעה אחרי עדכון התבנית.
     */
    const localText = buildReminderMessage(firstGuest);

    setPreview({
      text: localText,
      totalChars: localText.length,
      parts: Math.ceil(localText.length / 160),
      blocked: false,
      loading: true,
    });

    const abortController = new AbortController();

    async function validateWithServer() {
      try {
        const res = await fetch("/api/sms/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: abortController.signal,
          body: JSON.stringify({
            invitationId,
            guestId: firstGuest._id,
            messageOverride: localText,
          }),
        });

        const data = await res.json();

        if (abortController.signal.aborted) return;

        if (
          typeof data?.totalChars === "number" &&
          typeof data?.parts === "number"
        ) {
          setPreview({
            text: localText,
            totalChars: data.totalChars,
            parts: data.parts,
            blocked: !data.allowed,
            loading: false,
          });
        } else {
          setPreview((prev: any) => ({
            ...prev,
            text: localText,
            loading: false,
          }));
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;

        setPreview((prev: any) => ({
          ...prev,
          text: localText,
          loading: false,
        }));
      }
    }

    validateWithServer();

    return () => {
      abortController.abort();
    };
  }, [
    invitationId,
    guestsToSend,
    guestsWithTable,
    hasSeatingPackage,
    invitation,
    hideTableNumberForAll,
    hideSelectedTables,
    hiddenTableIds,
    eventDate,
    eventLocation,
    lat,
    lng,
  ]);

  /* ================= TEST ================= */

  const sendTestMessage = async () => {
    if (!preview?.text || !testPhone) return;

    if (testCount >= MAX_TEST_MESSAGES) {
      alert("ניתן לשלוח עד 2 הודעות בדיקה בלבד");
      return;
    }

    try {
      setSendingTest(true);

      const res = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invitationId,
          phone: testPhone,
          message: preview.text,
        }),
      });

      const data = await res.json();

      if (data?.success) {
        setTestCount((prev) => prev + 1);
        alert("הודעת בדיקה נשלחה בהצלחה");
        setTestPhone("");
      } else {
        alert(data?.error || "שגיאה בשליחת הודעת בדיקה");
      }
    } catch {
      alert("שגיאה בשליחה");
    } finally {
      setSendingTest(false);
    }
  };

  /* ================= LOCK ================= */

  async function toggleMessageLock(current: boolean) {
    try {
      const res = await fetch("/api/admin/toggle-message-lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          invitationId,
          key: "reminderSms",
          value: !current,
        }),
      });

      if (!res.ok) throw new Error("FAILED");

      setReminderLocked(!current);
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון הנעילה");
    }
  }

  const reminderAlreadySent = !!reminderSentAt;

  const userRole = String((user as any)?.role || "");

  const isAdmin =
    userRole === "admin" ||
    userRole === "super_admin" ||
    userRole === "superadmin" ||
    Boolean((user as any)?.impersonatedByAdmin);

  const sendButtonDisabled =
    (!isAdmin && reminderAlreadySent && reminderLocked) ||
    (sendTiming === "now" &&
      ((!preview && !message.trim()) ||
        (!isAdmin && preview?.blocked) ||
        guestsToSend.length === 0)) ||
    (sendTiming === "scheduled" && !scheduledAt) ||
    !message.trim();

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="rounded-[32px] border border-[#E7DCCB] bg-[#F8F1E6] p-8 text-center text-sm text-[#7A6246]"
      >
        טוען תזכורת…
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-8 text-[#3E2D20]">
      {/* HERO */}
      <section
        className="
          rounded-[34px]
          border border-[#E7DCCB]
          bg-gradient-to-br from-[#FFF8EE] via-[#F6EBD9] to-[#E7D4B6]
          p-6 sm:p-8
          shadow-[0_18px_60px_rgba(95,68,34,0.12)]
        "
      >
        <div
          className="
            rounded-[30px]
            border border-[#E8D9C4]
            bg-[#FFF9EF]/80
            px-6 py-7
            shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
          "
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
            <div className="text-center lg:text-right space-y-3">
              <div
                className="
                  inline-flex items-center gap-2
                  rounded-full
                  border border-[#D9B978]
                  bg-white/70
                  px-5 py-2
                  text-xs font-black text-[#8A642B]
                "
              >
                <span>💌</span>
                <span>ניהול תזכורת לאורחים</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#3B2A1D]">
                שליחת תזכורת
              </h2>

              <p className="max-w-xl text-sm sm:text-base leading-8 text-[#7A6246] mx-auto lg:mx-0">
                שליחת תזכורת אחת לאורחים שאישרו הגעה.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                value={confirmedGuests.length}
                label="מאשרים הגעה"
                icon="✅"
              />
              <StatCard
                value={guestsWithTable.length}
                label="עם שולחן"
                icon="🪑"
              />
              <StatCard
                value={pendingGuests.length}
                label="ממתינים"
                icon="⏳"
              />
              <StatCard
                value={reminderScheduledMessages.length}
                label="מתוזמנות"
                icon="📅"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* RIGHT SIDE */}
        <div className="space-y-6 xl:order-1">
          <Panel
            title="תצוגה מקדימה"
            subtitle="כך תיראה הודעת התזכורת"
            icon="✨"
          >
            {preview ? (
              <PhonePreview text={preview.text} />
            ) : (
              <EmptyState
                title="אין הודעה לתצוגה"
                text={
                  isScheduledMode
                    ? "אפשר לתזמן גם אם כרגע אין אורחים שאישרו הגעה. במועד המתוזמן המערכת תמשוך את הקהל הרלוונטי."
                    : "אין אורחים שאישרו הגעה."
                }
              />
            )}

            {preview && (
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <MiniStat label="תווים" value={preview.totalChars || 0} />
                <MiniStat label="חלקי SMS" value={preview.parts || 1} />
                <MiniStat label="נמענים" value={guestsToSend.length} />
              </div>
            )}
          </Panel>

          
        </div>

        {/* LEFT SIDE */}
        <div className="space-y-6 xl:order-2">
          <Panel
            title="ערוץ שליחה"
            subtitle="התזכורת נשלחת בסבב אחד"
            icon="💬"
          >
            <div
              className="
                rounded-[24px]
                border border-[#C79B45]
                bg-[#FFF2D8]
                p-5
                shadow-sm
              "
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-black text-[#3E2D20]">
                  SMS
                </span>
                <span className="text-xl">📩</span>
              </div>

              <p className="mt-2 text-xs leading-6 text-[#7A6246]">
                שליחה לכל מי שאישר הגעה.
              </p>
            </div>
          </Panel>

          <Panel title="קהל יעד" subtitle="נקבע אוטומטית" icon="👥">
            <div
              className="
                rounded-[24px]
                border border-[#E4D3BB]
                bg-white/70
                p-5
              "
            >
              <div className="grid grid-cols-3 gap-3 text-center">
                <MiniStat label="מאשרים" value={confirmedGuests.length} />
                <MiniStat label="ממתינים" value={pendingGuests.length} />
                <MiniStat label="לא מגיעים" value={declinedGuests.length} />
              </div>
            </div>
          </Panel>

          <Panel
            title="מספר שולחן בהודעת תזכורת"
            subtitle="ברירת המחדל: מי שיש לו שולחן מקבל מספר שולחן. מי שאין לו — מקבל בלי מספר."
            icon="🪑"
          >
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-[24px] border border-[#E4D3BB] bg-white/70 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={hideTableNumberForAll}
                  disabled={!eventId || savingVisibility}
                  onChange={async (e) => {
                    const next = e.target.checked;
                    setHideTableNumberForAll(next);
                    await persistTableVisibility({ hideTableNumberForAll: next });
                  }}
                />
                <span>
                  <span className="block text-sm font-black text-[#3E2D20]">
                    לשלוח את הודעת התזכורת ללא מספר שולחן לכולם
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#7A6246]">
                    גם אורחים שכבר שובצו לשולחן יקבלו הודעה בלי מספר שולחן.
                  </span>
                </span>
              </label>

              <div className="rounded-[24px] border border-[#E4D3BB] bg-white/70 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={hideSelectedTables}
                    disabled={!eventId || savingVisibility || hideTableNumberForAll}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      setHideSelectedTables(next);
                      const ids = next ? hiddenTableIds : [];
                      if (!next) setHiddenTableIds([]);
                      await persistTableVisibility({ hiddenTableIds: ids });
                    }}
                  />
                  <span>
                    <span className="block text-sm font-black text-[#3E2D20]">
                      הסתר מספר שולחן בשולחנות מסוימים
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#7A6246]">
                      אורח בשולחן שנבחר יקבל הודעה בלי מספר שולחן. בשאר השולחנות המספר יוצג כרגיל.
                    </span>
                  </span>
                </label>

                {hideSelectedTables && !hideTableNumberForAll && (
                  <div className="mt-4 grid max-h-56 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
                    {tables.length === 0 ? (
                      <p className="text-xs font-bold text-[#7A6246]">
                        אין שולחנות באירוע עדיין.
                      </p>
                    ) : (
                      tables.map((table) => {
                        const checked = hiddenTableIds.includes(table.id);
                        return (
                          <label
                            key={table.id}
                            className="flex items-center gap-2 rounded-2xl border border-[#EDE0CD] bg-[#FFFDF8] px-3 py-2 text-sm font-bold text-[#3E2D20]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={savingVisibility}
                              onChange={async (e) => {
                                const nextIds = e.target.checked
                                  ? [...hiddenTableIds, table.id]
                                  : hiddenTableIds.filter((id) => id !== table.id);
                                setHiddenTableIds(nextIds);
                                await persistTableVisibility({
                                  hiddenTableIds: nextIds,
                                });
                              }}
                            />
                            <span>{table.name || `שולחן ${table.id}`}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {reminderAlreadySent && reminderLocked && (
                <div
                  className="
                    rounded-[20px]
                    border border-[#D9B978]
                    bg-[#FFF8EA]
                    px-4 py-3
                    text-sm font-bold
                    text-[#8A642B]
                  "
                >
                  התזכורת מסומנת כנשלחה ונעולה למשתמשים רגילים, אבל אדמין יכול לשלוח שוב.
                </div>
              )}
            </div>
          </Panel>

          {/* SEND AREA */}
          <div
            className="
              rounded-[30px]
              border border-[#E7DCCB]
              bg-[#FFF9EF]
              p-5
              shadow-[0_14px_40px_rgba(95,68,34,0.08)]
              space-y-5
            "
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-[#3E2D20]">
                  שליחת תזכורת
                </h3>
                <p className="mt-1 text-sm text-[#7A6246]">
                  {isScheduledMode
                    ? "SMS · הקהל ייקבע בזמן השליחה המתוזמנת"
                    : `SMS · ${guestsToSend.length} נמענים`}
                </p>
              </div>

              <div
                className="
                  flex h-12 w-12 shrink-0 items-center justify-center
                  rounded-[18px]
                  bg-gradient-to-br from-white to-[#EBD8B6]
                  text-xl
                  shadow-sm
                "
              >
                📩
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSendTiming("now");
                  setScheduledDate("");
                  setScheduledTime("");
                }}
                className={sendTimingOptionClass(sendTiming === "now")}
              >
                <div>
                  <div className="font-black text-[#3E2D20]">
                    שליחה מיידית
                  </div>
                  <div className="mt-1 text-xs text-[#7A6246]">
                    ההודעה תישלח עכשיו.
                  </div>
                </div>

                <span className="text-xl">🚀</span>
              </button>

              <button
                type="button"
                onClick={() => setSendTiming("scheduled")}
                className={sendTimingOptionClass(sendTiming === "scheduled")}
              >
                <div>
                  <div className="font-black text-[#3E2D20]">
                    שליחה מתוזמנת
                  </div>
                  <div className="mt-1 text-xs text-[#7A6246]">
                    קביעת תאריך ושעה. הקהל ייקבע בזמן השליחה.
                  </div>
                </div>

                <span className="text-xl">📅</span>
              </button>
            </div>

            {sendTiming === "scheduled" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#6B5138]">
                    תאריך שליחה
                  </label>
                  <ScheduleDateField
                    min={new Date().toLocaleDateString("en-CA")}
                    value={scheduledDate}
                    onChange={setScheduledDate}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[#6B5138]">
                    שעת שליחה
                  </label>
                  <ScheduleTimeField
                    min={
                      scheduledDate === new Date().toLocaleDateString("en-CA")
                        ? new Date().toTimeString().slice(0, 5)
                        : undefined
                    }
                    value={scheduledTime}
                    onChange={setScheduledTime}
                    className={inputClassName}
                  />
                </div>
              </div>
            )}

            <div className="send-button-gold">
              <SendButton
                channel="sms"
                type="reminder"
                invitationId={invitationId}
                audience={
                  sendTiming === "scheduled"
                    ? []
                    : guestsToSend.map((g) => g._id)
                }
                scheduledAt={scheduledAt}
                onAfterSend={async () => {
                  if (sendTiming === "now") {
                    setReminderSentAt(new Date());
                  }

                  await loadScheduledMessages();
                }}
                disabled={sendButtonDisabled}
              >
                {reminderAlreadySent && !isAdmin
                  ? "✓ תזכורת נשלחה"
                  : sendTiming === "scheduled"
                    ? "⏱️ תזמן תזכורת"
                    : reminderAlreadySent && isAdmin
                      ? `📩 שלח שוב תזכורת (${guestsToSend.length})`
                      : `📩 שלח תזכורת (${guestsToSend.length})`}
              </SendButton>
            </div>
          </div>

          {reminderScheduledMessages.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                await loadScheduledMessages();
                setShowScheduled(true);
              }}
              className="
                w-full
                rounded-[24px]
                border border-[#E2CFB5]
                bg-white
                px-6 py-4
                text-sm font-black
                text-[#6B5138]
                shadow-sm
                transition
                hover:bg-[#FFF8EA]
                hover:shadow-md
              "
            >
              📅 צפייה בהודעות מתוזמנות
            </button>
          )}
        </div>
      </section>

      {/* SCHEDULED MESSAGES - FULL WIDTH */}
      {showScheduled && (
        <section
          className="
            w-full
            rounded-[30px]
            border border-[#E7DCCB]
            bg-[#FFF9EF]
            p-5 sm:p-6
            shadow-[0_14px_40px_rgba(95,68,34,0.08)]
          "
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-[#3E2D20]">
              📅 הודעות מתוזמנות
            </h2>

            <button
              type="button"
              onClick={() => setShowScheduled(false)}
              className="
                flex h-10 w-10 items-center justify-center
                rounded-full
                bg-white
                text-lg font-black
                text-[#6B5138]
                shadow-sm
                transition
                hover:bg-[#F6EBD9]
              "
            >
              ✕
            </button>
          </div>

          <div className="w-full overflow-x-auto">
            <ScheduledMessagesTable
              messages={reminderScheduledMessages}
              onChange={loadScheduledMessages}
            />
          </div>
        </section>
      )}

      <style>{`
        .send-button-gold button {
          width: 100% !important;
          border-radius: 20px !important;
          background: linear-gradient(
            135deg,
            #c9964d 0%,
            #b9822e 50%,
            #a56d25 100%
          ) !important;
          color: #ffffff !important;
          font-weight: 900 !important;
          box-shadow: none !important;
          border: none !important;
          min-height: 48px !important;
        }

        .send-button-gold button:hover {
          filter: brightness(1.03);
        }

        .send-button-gold button:disabled {
          background: #ccb892 !important;
          color: rgba(255, 255, 255, 0.92) !important;
          cursor: not-allowed !important;
          opacity: 1 !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}

/* ================= HELPERS ================= */

function hasTable(g: Guest) {
  return !!g.tableName || typeof g.tableNumber === "number";
}

function detectSeatingPackage(invitation: any, guestsWithTableCount: number) {
  if (!invitation) {
    return guestsWithTableCount > 0;
  }

  return Boolean(
    invitation?.includeSeating ||
      invitation?.hasSeating ||
      invitation?.seatingIncluded ||
      invitation?.includeSeatingManagement ||
      invitation?.packageIncludesSeating ||
      invitation?.features?.seating ||
      invitation?.features?.includeSeating ||
      invitation?.addons?.seating ||
      invitation?.package?.includeSeating ||
      invitation?.package?.seating ||
      invitation?.plan?.includeSeating ||
      invitation?.plan?.seating ||
      guestsWithTableCount > 0
  );
}

/* ================= UI ================= */

function PhonePreview({ text }: { text: string }) {
  return (
    <div className="flex justify-center py-2">
      <div
        className="
          relative
          h-[610px]
          w-[318px]
          rounded-[56px]
          bg-black
          p-[12px]
          shadow-[0_28px_70px_rgba(0,0,0,0.35)]
        "
      >
        <div
          className="
            absolute
            left-1/2
            top-[12px]
            z-20
            h-[28px]
            w-[126px]
            -translate-x-1/2
            rounded-b-[18px]
            bg-black
          "
        />

        <div
          className="
            relative
            h-full
            w-full
            overflow-hidden
            rounded-[44px]
            bg-[#F6EFE6]
          "
        >
          <div
            className="
              flex
              h-[58px]
              items-end
              justify-center
              border-b
              border-[#E1D4C5]
              bg-[#EFE4D4]
              pb-3
              text-[11px]
              font-black
              tracking-wide
              text-[#6B5138]
            "
          >
            INVISTIMO · SMS
          </div>

          <div
            className="
              h-[calc(100%-58px)]
              overflow-y-auto
              bg-[radial-gradient(circle_at_top,#FFF8EC_0,#F4EDE3_48%,#E9DDCD_100%)]
              p-4
            "
          >
            <div className="flex min-h-full items-center justify-center">
              <div
                className="
                  max-w-[92%]
                  whitespace-pre-wrap
                  break-words
                  rounded-[28px]
                  rounded-tr-[10px]
                  bg-white
                  px-4
                  py-4
                  text-right
                  text-sm
                  leading-7
                  text-[#3E2D20]
                  shadow-[0_10px_30px_rgba(68,47,24,0.12)]
                "
              >
                {text}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: string;
}) {
  return (
    <div
      className="
        rounded-[22px]
        border border-[#E2CFB5]
        bg-white/65
        px-4 py-4
        shadow-sm
      "
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl font-black text-[#3E2D20]">{value}</span>
        <span className="text-lg">{icon}</span>
      </div>

      <div className="mt-2 text-xs font-bold text-[#7A6246]">{label}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="
        rounded-[30px]
        border border-[#E7DCCB]
        bg-[#FFF9EF]/90
        p-5 sm:p-6
        shadow-[0_14px_40px_rgba(95,68,34,0.08)]
      "
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-[#3E2D20]">{title}</h3>

          {subtitle && (
            <p className="mt-1 text-sm leading-6 text-[#7A6246]">
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div
            className="
              flex h-12 w-12 shrink-0 items-center justify-center
              rounded-[18px]
              bg-gradient-to-br from-white to-[#EBD8B6]
              text-xl
              shadow-sm
            "
          >
            {icon}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[18px] bg-white/80 px-3 py-3 shadow-sm">
      <div className="text-lg font-black text-[#3E2D20]">{value}</div>
      <div className="mt-1 text-[11px] font-bold text-[#7A6246]">{label}</div>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      className="
        rounded-[24px]
        border border-dashed border-[#D8C2A4]
        bg-white/50
        px-5 py-10
        text-center
      "
    >
      <div className="text-lg font-black text-[#3E2D20]">{title}</div>
      <div className="mt-2 text-sm text-[#7A6246]">{text}</div>
    </div>
  );
}

function sendTimingOptionClass(active: boolean) {
  return `
    flex items-center justify-between gap-4
    rounded-[22px]
    border
    px-5 py-4
    text-right
    transition
    ${
      active
        ? "border-[#C79B45] bg-[#FFF2D8] shadow-sm"
        : "border-[#E4D3BB] bg-white/70 hover:bg-white"
    }
  `;
}

const inputClassName = `
  w-full
  rounded-[20px]
  border border-[#E4D3BB]
  bg-white
  px-4 py-3
  text-sm
  outline-none
  transition
  focus:border-[#C79B45]
  focus:ring-4
  focus:ring-[#E8C878]/20
`;

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasGuestMessagesFeature } from "@/lib/features/entitlements";

type ThreadMessage = {
  id: string;
  sender?: "guest" | "couple";
  message: string;
  createdAt?: string;
  readAt?: string | null;
  status: "unread" | "read";
};

type GuestThread = {
  guestId: string;
  guestName: string;
  unreadCount: number;
  lastMessage: string;
  lastAt?: string;
  messages: ThreadMessage[];
};

export default function DashboardGuestMessagesPage() {
  const { user } = useAuth();
  const enabled = hasGuestMessagesFeature(user);
  const [threads, setThreads] = useState<GuestThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledFromApi, setEnabledFromApi] = useState(enabled);
  const [openGuestId, setOpenGuestId] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/guest-messages", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      setEnabledFromApi(Boolean(data?.enabled));
      setThreads(Array.isArray(data?.threads) ? data.threads : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openThread = threads.find((thread) => thread.guestId === openGuestId) || null;

  async function markThreadRead(thread: GuestThread) {
    const unread = thread.messages.filter(
      (item) => item.sender !== "couple" && item.status !== "read"
    );
    await Promise.all(
      unread.map((item) =>
        fetch(`/api/guest-messages/${item.id}`, {
          method: "PATCH",
          credentials: "include",
        })
      )
    );
    setThreads((prev) =>
      prev.map((item) =>
        item.guestId === thread.guestId
          ? {
              ...item,
              unreadCount: 0,
              messages: item.messages.map((message) =>
                message.sender === "couple"
                  ? message
                  : { ...message, status: "read", readAt: new Date().toISOString() }
              ),
            }
          : item
      )
    );
  }

  async function sendReply() {
    if (!openThread || sending) return;
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch("/api/guest-messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: openThread.guestId, message: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.item) throw new Error(data?.error || "REPLY_FAILED");
      setReply("");
      setThreads((prev) =>
        prev.map((thread) =>
          thread.guestId === openThread.guestId
            ? {
                ...thread,
                unreadCount: 0,
                lastMessage: data.item.message,
                lastAt: data.item.createdAt,
                messages: [...thread.messages, data.item],
              }
            : thread
        )
      );
    } finally {
      setSending(false);
    }
  }

  if (!enabled && !enabledFromApi && !loading) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[32px] border border-[#E7DED1] bg-white p-8 text-center">
          <h1 className="text-3xl font-black text-[#241A14]">הודעות מהאורחים</h1>
          <p className="mt-3 text-sm font-semibold text-[#8A7B69]">
            הפיצ׳ר לא פתוח ללקוח הזה.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex text-sm font-black text-[#B8844F]">
            חזרה לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  return (
    <div dir="rtl" className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-black text-[#B8844F]">אתר החתונה</p>
      <h1 className="mt-2 text-3xl font-black text-[#241A14]">הודעות מהאורחים</h1>
      <p className="mt-2 text-sm font-semibold text-[#8A7B69]">
        שיחות אישיות עם האורחים מהאתר. כל אורח רואה בקישור האישי שלו רק את השיחה שלו. זה נפרד מהערות RSVP.
      </p>
      {unreadCount > 0 ? (
        <p className="mt-4 inline-flex rounded-full bg-[#B8844F] px-3 py-1 text-xs font-black text-white">
          הודעות מהאורחים {unreadCount}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm font-bold text-[#8A7B69]">טוען שיחות...</p>
      ) : threads.length === 0 ? (
        <p className="mt-10 text-sm font-bold text-[#8A7B69]">עדיין אין הודעות מהאורחים.</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {threads.map((thread) => (
              <button
                key={thread.guestId}
                type="button"
                onClick={() => {
                  setOpenGuestId(thread.guestId);
                  if (thread.unreadCount > 0) void markThreadRead(thread);
                }}
                className={`w-full rounded-[24px] border p-4 text-right ${
                  openGuestId === thread.guestId
                    ? "border-[#D9B46F] bg-[#FFF9EF]"
                    : thread.unreadCount
                      ? "border-[#D9B46F] bg-white"
                      : "border-[#EFE4D6] bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-[#241A14]">{thread.guestName}</p>
                  {thread.unreadCount > 0 ? (
                    <span className="rounded-full bg-[#B8844F] px-2 py-0.5 text-[10px] font-black text-white">
                      {thread.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold text-[#8A7B69]">
                  {thread.lastMessage}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-[28px] border border-[#EFE4D6] bg-white p-5">
            {openThread ? (
              <>
                <p className="text-sm font-black text-[#241A14]">{openThread.guestName}</p>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-auto">
                  {openThread.messages.map((item) => {
                    const fromCouple = item.sender === "couple";
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                          fromCouple
                            ? "mr-10 bg-[#241A14] text-white"
                            : "ml-10 bg-[#FFF9EF] text-[#3f3327]"
                        }`}
                      >
                        <p className="text-[10px] font-black opacity-70">
                          {fromCouple ? "אתם" : openThread.guestName}
                          {item.createdAt
                            ? ` · ${new Date(item.createdAt).toLocaleString("he-IL")}`
                            : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap font-semibold">{item.message}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value.slice(0, 1000))}
                    rows={3}
                    maxLength={1000}
                    placeholder="כתבו תשובה לאורח..."
                    className="w-full rounded-2xl border border-[#E7DED1] px-4 py-3 text-sm"
                  />
                  <button
                    type="button"
                    disabled={sending || !reply.trim()}
                    onClick={sendReply}
                    className="min-h-[48px] w-full rounded-2xl bg-[#241A14] text-sm font-black text-white disabled:opacity-50"
                  >
                    {sending ? "שולח..." : "שליחת תשובה"}
                  </button>
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-sm font-semibold text-[#8A7B69]">
                בחרו שיחה כדי לקרוא ולהשיב.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

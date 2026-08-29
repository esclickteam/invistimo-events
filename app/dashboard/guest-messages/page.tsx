"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasGuestMessagesFeature } from "@/lib/features/entitlements";

type GuestMessageItem = {
  id: string;
  message: string;
  createdAt?: string;
  readAt?: string | null;
  status: "unread" | "read";
  guest: { id: string; name: string };
};

export default function DashboardGuestMessagesPage() {
  const { user } = useAuth();
  const enabled = hasGuestMessagesFeature(user);
  const [items, setItems] = useState<GuestMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledFromApi, setEnabledFromApi] = useState(enabled);

  async function load() {
    try {
      const res = await fetch("/api/guest-messages", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      setEnabledFromApi(Boolean(data?.enabled));
      setItems(Array.isArray(data?.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/guest-messages/${id}`, {
      method: "PATCH",
      credentials: "include",
    });
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "read", readAt: new Date().toISOString() }
          : item
      )
    );
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

  const unreadCount = items.filter((item) => item.status !== "read").length;

  return (
    <div dir="rtl" className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs font-black text-[#B8844F]">אתר החתונה</p>
      <h1 className="mt-2 text-3xl font-black text-[#241A14]">הודעות מהאורחים</h1>
      <p className="mt-2 text-sm font-semibold text-[#8A7B69]">
        הודעות אישיות שהאורחים שלחו מהאתר. זה נפרד מהערות RSVP.
      </p>
      {unreadCount > 0 ? (
        <p className="mt-4 inline-flex rounded-full bg-[#B8844F] px-3 py-1 text-xs font-black text-white">
          הודעות מהאורחים {unreadCount}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm font-bold text-[#8A7B69]">טוען הודעות...</p>
      ) : items.length === 0 ? (
        <p className="mt-10 text-sm font-bold text-[#8A7B69]">עדיין אין הודעות מהאורחים.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.status !== "read" && markRead(item.id)}
              className={`w-full rounded-[28px] border p-5 text-right ${
                item.status === "read"
                  ? "border-[#EFE4D6] bg-white"
                  : "border-[#D9B46F] bg-[#FFF9EF]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[#241A14]">{item.guest.name}</p>
                <p className="text-xs font-semibold text-[#8A7B69]">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString("he-IL")
                    : ""}
                </p>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#3f3327]">
                {item.message}
              </p>
              <p className="mt-2 text-xs font-bold text-[#B8844F]">
                {item.status === "read" ? "נקראה" : "חדשה — לחצו לסימון כנקראה"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

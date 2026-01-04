"use client";

import { useEffect, useState } from "react";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";
import { useRouter } from "next/navigation";

export default function ScheduledMessagesPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduled-messages");
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500" dir="rtl">
        טוען הודעות מתוזמנות…
      </div>
    );
  }

  return (
    <div className="p-8" dir="rtl">
      {/* ניווט עליון – אותו עולם של הודעות */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#4a413a]">
          ⏱️ הודעות מתוזמנות
        </h1>

        <button
          onClick={() => router.push("/dashboard/messages")}
          className="text-sm text-gray-600 hover:underline"
        >
          ← חזרה למסך הודעות
        </button>
      </div>

      {/* הסבר קטן – UX */}
      <p className="text-sm text-gray-500 mb-6 max-w-[700px]">
        כאן תוכלו לראות הודעות SMS שתוזמנו לשליחה עתידית, לערוך את תוכן ההודעה
        או לבטל אותה לפני מועד השליחה.
      </p>

      {/* טבלה */}
      {messages.length === 0 ? (
        <div className="bg-gray-50 border border-dashed rounded-xl p-10 text-center text-gray-500">
          אין הודעות מתוזמנות כרגע
        </div>
      ) : (
        <ScheduledMessagesTable
          messages={messages}
          onChange={loadMessages}
        />
      )}
    </div>
  );
}

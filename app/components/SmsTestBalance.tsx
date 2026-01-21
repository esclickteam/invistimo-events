"use client";

import { useEffect, useState } from "react";

type TestBalance = {
  max: number;
  used: number;
  remaining: number;
};

export default function SmsTestBalance() {
  const [data, setData] = useState<TestBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/sms/test/balance", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const json = await res.json();
        setData(json);
      } catch {
        // שקט – לא קריטי
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading || !data) return null;

  const { max, used, remaining } = data;
  const progress = (used / max) * 100;

  return (
    <div className="mb-4 border rounded-xl p-4 bg-[#faf9f7]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#4a413a]">
          🧪 בדיקות הודעה חינמיות
        </h3>

        <span className="text-xs text-gray-500">
          {used} / {max}
        </span>
      </div>

      {/* progress bar */}
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all ${
            remaining === 0
              ? "bg-red-500"
              : remaining <= 2
              ? "bg-orange-500"
              : "bg-green-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* text */}
      {remaining > 0 ? (
        <p className="text-xs text-gray-600">
          נותרו <strong>{remaining}</strong> בדיקות ללא עלות
        </p>
      ) : (
        <p className="text-xs text-red-600">
          ❌ נוצלו כל בדיקות ההודעה החינמיות
        </p>
      )}
    </div>
  );
}

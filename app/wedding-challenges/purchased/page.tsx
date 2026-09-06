"use client";

import { useEffect, useState } from "react";

export default function WeddingChallengesPurchasedPage() {
  const [message, setMessage] = useState("מאשרים את הרכישה...");

  useEffect(() => {
    let cancelled = false;

    async function finalize() {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        try {
          const meRes = await fetch("/api/me", {
            credentials: "include",
            cache: "no-store",
          });
          const me = await meRes.json().catch(() => ({}));
          const user = me?.user;
          if (!user?._id) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          const entitlementRes = await fetch("/api/wedding-challenges/entitlement", {
            credentials: "include",
            cache: "no-store",
          });
          const entitlement = await entitlementRes.json().catch(() => ({}));
          if (!entitlement?.entitled) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          await fetch("/api/auth/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId: user._id }),
          });

          if (!cancelled) {
            window.location.href = "/dashboard/wedding-challenges?purchased=1";
          }
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (!cancelled) {
        setMessage("התשלום התקבל. אם הדשבורד עדיין לא נפתח, התחברו מחדש.");
      }
    }

    void finalize();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2eb] px-4" dir="rtl">
      <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-lg">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#5c4632]">
          הרכישה הושלמה
        </h1>
        <p className="mt-4 text-sm text-[#7B6754]">{message}</p>
      </div>
    </main>
  );
}

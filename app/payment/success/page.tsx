"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function finalizePayment() {
      const maxAttempts = 10; // עד 10 ניסיונות
      const delay = 1000; // כל שנייה

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const meRes = await fetch("/api/me", {
            credentials: "include",
            cache: "no-store",
          });

          if (!meRes.ok) {
            console.error("❌ Failed to fetch /api/me");
            return;
          }

          const me = await meRes.json();
          const user = me?.user;

          // אם התשלום עוד לא עודכן – נחכה וננסה שוב
          if (!user?._id || user.hasPaid !== true) {
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          // ריענון טוקן
          const refreshRes = await fetch("/api/auth/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              userId: user._id,
            }),
          });

          if (!refreshRes.ok) {
            console.error("❌ Failed to refresh auth token");
            return;
          }

          if (!cancelled) {
  window.location.href = "/dashboard";
}


          return;
        } catch (err) {
          console.error("❌ Payment finalize error", err);
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      console.error("❌ Payment not confirmed after retries");
    }

    finalizePayment();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f2eb]">
      <div className="bg-white rounded-3xl shadow-lg p-10 text-center max-w-md">
        <h1 className="text-3xl font-serif text-[#5c4632] mb-4">
          התשלום הושלם בהצלחה 🎉
        </h1>

        <p className="text-[#7b6754] mb-6">
          מעדכנים הרשאות ומעבירים אותך לדשבורד…
        </p>

        <div className="animate-pulse text-[#d4b28c] font-semibold">
          Loading…
        </div>
      </div>
    </div>
  );
}

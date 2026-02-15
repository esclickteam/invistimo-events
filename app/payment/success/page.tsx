"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function finalizePayment() {
      try {
        /* ======================================================
           1) קבלת משתמש מעודכן מהשרת (DB)
        ====================================================== */
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!meRes.ok) {
          console.error("❌ Failed to fetch /api/auth/me");
          return;
        }

        const me = await meRes.json();
        const user = me?.user;

        if (!user?._id || user.hasPaid !== true) {
          console.error(
            "❌ Payment success but user not marked as paid",
            me
          );
          return;
        }

        /* ======================================================
           2) ריענון JWT (hasPaid=true נכנס לטוקן)
        ====================================================== */
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

        /* ======================================================
           3) מעבר לדשבורד
        ====================================================== */
        if (!cancelled) {
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("❌ Payment success finalize error", err);
      }
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

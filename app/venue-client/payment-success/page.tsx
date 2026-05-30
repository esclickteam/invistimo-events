"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

type CompleteStatus = "loading" | "success" | "error";

function PaymentSuccessInner() {
  const params = useSearchParams();
  const sessionId = String(params.get("session_id") || "").trim();
  const redirectTo = String(params.get("redirectTo") || "/dashboard").trim() || "/dashboard";

  const didCompleteRef = useRef(false);

  const [status, setStatus] = useState<CompleteStatus>("loading");
  const [message, setMessage] = useState(
    "מאמתים את התשלום ופותחים את החבילה..."
  );
  const [redirectUrl, setRedirectUrl] = useState("/dashboard");

  useEffect(() => {
    async function completePayment() {
      if (didCompleteRef.current) {
        return;
      }

      didCompleteRef.current = true;

      if (!sessionId) {
        setStatus("error");
        setMessage("חסר מזהה תשלום. לא ניתן לפתוח את החבילה.");
        return;
      }

      try {
        const res = await fetch(
          "/api/venues/client-registration/payment-success",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              sessionId,
            }),
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          throw new Error(
            data?.message || data?.error || "פתיחת החבילה לאחר התשלום נכשלה"
          );
        }

        const nextRedirectUrl = redirectTo || String(data?.redirectUrl || "/dashboard");

        setStatus("success");
        setMessage(data?.message || "החבילה נפתחה בהצלחה. מעבירים אותך לדשבורד...");
        setRedirectUrl(nextRedirectUrl);

        window.location.replace(nextRedirectUrl);
      } catch (error: any) {
        console.error("payment success complete error:", error);

        didCompleteRef.current = false;

        setStatus("error");
        setMessage(error?.message || "שגיאה באימות התשלום");
      }
    }

    completePayment();
  }, [sessionId, redirectTo]);

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F7EFE6] text-[#2b241c]"
    >
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="pointer-events-none absolute -top-24 right-[12%] h-72 w-72 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-60px] left-[8%] h-80 w-80 rounded-full bg-[#CDA37D]/15 blur-3xl" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55 }}
          className="w-full max-w-xl rounded-[34px] border border-[#E3D2BC] bg-white/95 p-8 text-center shadow-[0_24px_70px_rgba(91,64,35,0.13)]"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FFF4DE] text-3xl text-[#B8872E]">
            {status === "loading" ? "…" : status === "success" ? "✓" : "!"}
          </div>

          <p className="mt-6 font-serif text-[28px] tracking-[0.20em] text-[#8A6338]">
            INVISTIMO
          </p>

          <h1 className="mt-6 text-3xl font-black text-[#3E2D20]">
            {status === "loading"
              ? "פותחים את החבילה"
              : status === "success"
                ? "התשלום התקבל"
                : "אירעה שגיאה"}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-7 text-[#7B6754]">
            {message}
          </p>

          {status === "loading" && (
            <div className="mx-auto mt-6 h-2 w-48 overflow-hidden rounded-full bg-[#eee2d2]">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[#B8872E]" />
            </div>
          )}

          {status === "success" && (
            <Link
              href={redirectUrl}
              className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-[#B8872E] px-7 text-sm font-black text-white transition hover:bg-[#9f7427]"
            >
              מעבר לדשבורד
            </Link>
          )}

          {status === "error" && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-12 rounded-2xl bg-[#B8872E] px-7 text-sm font-black text-white transition hover:bg-[#9f7427]"
              >
                נסה שוב
              </button>

              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E3D2BC] bg-white px-7 text-sm font-black text-[#8A6338] transition hover:bg-[#FFF8EE]"
              >
                מעבר לדשבורד
              </Link>
            </div>
          )}
        </motion.div>
      </section>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessInner />
    </Suspense>
  );
}
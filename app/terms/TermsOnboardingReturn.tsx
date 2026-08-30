"use client";

import { useSearchParams } from "next/navigation";

export default function TermsOnboardingReturn() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const token = searchParams.get("token");

  if (from !== "set-password" || !token) {
    return null;
  }

  const href = `/set-password?token=${encodeURIComponent(token)}&termsRead=1`;

  return (
    <div className="mt-12 rounded-3xl border border-[#eadfce] bg-[#fff7ec] p-6 text-center">
      <p className="text-sm font-bold leading-6 text-[#5c4632]">
        לאחר קריאת התקנון במלואו, לחצו כאן כדי לחזור לאישור ולהמשך הגדרת
        הסיסמה.
      </p>
      <a
        href={href}
        onClick={() => {
          try {
            sessionStorage.setItem(`set-password-terms-read:${token}`, "1");
          } catch {
            // ignore
          }
        }}
        className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl bg-[#3f3327] px-6 text-sm font-black text-white"
      >
        קראתי את התקנון, חזרה לאישור
      </a>
    </div>
  );
}

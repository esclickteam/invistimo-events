"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { GuestPassPayload } from "@/lib/checkIn/guestPassState";
import { guestPassView } from "@/lib/checkIn/guestPassState";

type Props = {
  pass: GuestPassPayload;
  onToggleShowQr?: (show: boolean) => void;
  showQrAgain?: boolean;
};

export default function CheckInPassView({
  pass,
  onToggleShowQr,
  showQrAgain = false,
}: Props) {
  const [localShowQr, setLocalShowQr] = useState(showQrAgain);
  const showingQrAgain = onToggleShowQr ? showQrAgain : localShowQr;

  const view = useMemo(
    () =>
      guestPassView({
        checkedInCount: pass.checkedInGuestCount,
        confirmedCount: pass.confirmedGuestCount,
        showQrAgain: showingQrAgain,
      }),
    [pass.checkedInGuestCount, pass.confirmedGuestCount, showingQrAgain]
  );

  const setShowQrAgain = (next: boolean) => {
    if (onToggleShowQr) onToggleShowQr(next);
    else setLocalShowQr(next);
  };

  if (view.showWelcome) {
    return (
      <main
        className="relative min-h-screen overflow-hidden bg-[#241A14] px-4 py-12 text-[#FFFDF8]"
        dir="rtl"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#B88A2D33,transparent_55%)]" />
        <div className="relative mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center text-center">
          <p className="text-[11px] font-black tracking-[0.22em] text-[#E8C57A]">
            {pass.coupleNames || pass.eventTitle}
          </p>
          <h1 className="mt-6 text-[2rem] font-black leading-tight">
            תודה שהגעתם לשמוח איתנו ❤️
          </h1>
          {pass.tableLabel ? (
            <div className="mt-8 w-full rounded-[28px] border border-[#E8C57A]/40 bg-[#2C2119] px-6 py-7">
              <p className="text-xs font-bold tracking-wide text-[#E8C57A]">
                השולחן שלכם
              </p>
              <p className="mt-2 text-4xl font-black">{pass.tableLabel}</p>
            </div>
          ) : null}
          <p className="mt-6 text-sm font-bold text-[#EADBC4]">
            מאחלים לכם ערב מהנה
          </p>

          {pass.giftCreditUrl ? (
            <a
              href={pass.giftCreditUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex w-full items-center justify-center rounded-[18px] bg-[#E8C57A] px-5 py-4 text-sm font-black text-[#241A14]"
            >
              שליחת מתנה
            </a>
          ) : null}

          {pass.detailsUrl ? (
            <Link
              href={pass.detailsUrl}
              className="mt-3 inline-flex w-full items-center justify-center rounded-[18px] border border-[#E8C57A]/50 px-5 py-4 text-sm font-black text-[#FFFDF8]"
            >
              לכל פרטי האירוע
            </Link>
          ) : null}

          {view.showShowQrAgain ? (
            <button
              type="button"
              onClick={() => setShowQrAgain(true)}
              className="mt-6 text-xs font-bold text-[#E8C57A] underline-offset-4 hover:underline"
            >
              הצגת קוד כניסה נוסף
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  const eventLabel = pass.coupleNames || pass.eventTitle;

  return (
    <main
      className="relative min-h-dvh overflow-hidden bg-[#F6EFE6] px-5 py-8 text-[#2F2924]"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-90px] top-[-90px] h-[240px] w-[240px] rounded-full bg-[#E6CDB2]/40 blur-3xl" />
        <div className="absolute bottom-[-100px] left-[-80px] h-[260px] w-[260px] rounded-full bg-[#D9BFA3]/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[380px] flex-col items-center justify-center">
        <section className="w-full rounded-[28px] border border-[#E3D6C3] bg-[#FFFDF8] px-6 py-8 text-center shadow-[0_18px_40px_rgba(80,55,32,0.08)]">
          {eventLabel ? (
            <p className="text-[15px] font-medium tracking-[0.04em] text-[#8B6B50]">
              {eventLabel}
            </p>
          ) : null}

          <p className="mt-2 text-[12px] font-semibold text-[#9A8775]">
            קוד הכניסה האישי שלכם
          </p>

          <div className="mx-auto mt-5 flex h-6 items-center justify-center gap-2 text-[#C4A06A]">
            <span className="h-px w-10 bg-[#E3D6C3]" />
            <span className="text-[11px] leading-none">✦</span>
            <span className="h-px w-10 bg-[#E3D6C3]" />
          </div>

          <div className="mx-auto mt-5 flex h-[236px] w-[236px] items-center justify-center rounded-2xl border border-[#E8DCCB] bg-white p-3 shadow-[0_8px_20px_rgba(80,55,32,0.06)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pass.qrSrc}
              alt="QR כניסה אישי"
              width={220}
              height={220}
              className="h-full w-full object-contain"
            />
          </div>

          <p className="mt-5 text-[13px] font-medium leading-6 text-[#8A7A68]">
            הציגו את הקוד בכניסה לאירוע
          </p>

          {pass.detailsUrl ? (
            <Link
              href={pass.detailsUrl}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D9B46F]/55 bg-gradient-to-l from-[#FFF7E8] via-[#FFFDF8] to-[#F8EFE3] px-5 py-2.5 text-[13px] font-semibold text-[#8B5E24] shadow-[0_6px_16px_rgba(139,94,36,0.08)]"
            >
              לכל פרטי האירוע
              <span aria-hidden className="text-[15px] leading-none">
                ←
              </span>
            </Link>
          ) : null}

          {view.showShowQrAgain ? (
            <button
              type="button"
              onClick={() => setShowQrAgain(false)}
              className="mt-4 text-[12px] font-medium text-[#9A8775] underline-offset-4 hover:underline"
            >
              חזרה למסך התודה
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}

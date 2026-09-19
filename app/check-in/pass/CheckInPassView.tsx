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
              פרטי האירוע
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

  return (
    <main
      className="min-h-screen bg-[#faf7f3] px-4 py-10 text-[#241A14]"
      dir="rtl"
    >
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center">
        <div className="w-full rounded-[32px] border border-[#EADBC4] bg-[#FFFDF8] px-6 py-8 shadow-sm">
          <p className="text-center text-[11px] font-black tracking-[0.18em] text-[#B88A2D]">
            {pass.eventTitle}
          </p>
          <h1 className="mt-4 text-center text-3xl font-black leading-tight">
            {pass.guestName}
          </h1>
          <div className="mt-8 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pass.qrSrc}
              alt="QR כניסה אישי"
              width={280}
              height={280}
              className="rounded-[24px] border border-[#EADBC4] bg-white p-4"
            />
          </div>
          <p className="mt-6 text-center text-base font-black text-[#3F3328]">
            הציגו את הקוד בכניסה לאירוע
          </p>
          {view.showShowQrAgain ? (
            <button
              type="button"
              onClick={() => setShowQrAgain(false)}
              className="mt-6 w-full text-center text-xs font-bold text-[#8A7A68]"
            >
              חזרה למסך התודה
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

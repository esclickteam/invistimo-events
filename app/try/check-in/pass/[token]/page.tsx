"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import CheckInPassView from "@/app/check-in/pass/CheckInPassView";
import {
  DEMO_CHECKIN_CHANNEL,
  DEMO_CHECKIN_STORAGE_KEY,
  isDemoCheckInToken,
  readDemoCheckInState,
} from "@/lib/checkIn/demoCheckIn";
import type { GuestPassPayload } from "@/lib/checkIn/guestPassState";

function toPass(token: string): GuestPassPayload | null {
  const guest = readDemoCheckInState().guests.find((item) => item.token === token);
  if (!guest) return null;
  return {
    token: guest.token,
    guestName: guest.name,
    eventTitle: guest.eventTitle,
    coupleNames: guest.coupleNames,
    tableLabel: guest.tableName,
    confirmedGuestCount: guest.confirmedGuestCount,
    checkedInGuestCount: guest.checkedInGuestCount,
    remaining: Math.max(0, guest.confirmedGuestCount - guest.checkedInGuestCount),
    fullyArrived: guest.checkedInGuestCount >= guest.confirmedGuestCount,
    giftCreditUrl: guest.giftCreditUrl,
    detailsUrl: guest.detailsUrl,
    qrSrc: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(guest.token)}`,
  };
}

export default function DemoCheckInPassPage() {
  const params = useParams();
  const token = decodeURIComponent(String(params?.token || "")).trim();
  const [pass, setPass] = useState<GuestPassPayload | null>(null);
  const [showQrAgain, setShowQrAgain] = useState(false);

  const valid = useMemo(() => isDemoCheckInToken(token), [token]);

  useEffect(() => {
    if (!valid) return;
    const sync = () => setPass(toPass(token));
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === DEMO_CHECKIN_STORAGE_KEY) sync();
    };
    const onCustom = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener(DEMO_CHECKIN_CHANNEL, onCustom as EventListener);
    const poll = window.setInterval(sync, 1000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DEMO_CHECKIN_CHANNEL, onCustom as EventListener);
      window.clearInterval(poll);
    };
  }, [token, valid]);

  if (!valid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] text-sm font-bold text-[#7C6A58]" dir="rtl">
        קוד כניסה לא נמצא
      </main>
    );
  }

  if (!pass) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] text-sm font-bold text-[#7C6A58]" dir="rtl">
        טוען...
      </main>
    );
  }

  return (
    <CheckInPassView
      pass={pass}
      showQrAgain={showQrAgain}
      onToggleShowQr={setShowQrAgain}
    />
  );
}

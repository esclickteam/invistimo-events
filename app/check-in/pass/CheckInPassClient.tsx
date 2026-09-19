"use client";

import { useEffect, useState } from "react";

import type { GuestPassPayload } from "@/lib/checkIn/guestPassState";
import CheckInPassView from "./CheckInPassView";

type Props = {
  initialPass: GuestPassPayload;
};

export default function CheckInPassClient({ initialPass }: Props) {
  const [pass, setPass] = useState(initialPass);
  const [showQrAgain, setShowQrAgain] = useState(false);

  useEffect(() => {
    setPass(initialPass);
  }, [initialPass]);

  useEffect(() => {
    if (pass.checkedInGuestCount <= 0) setShowQrAgain(false);
  }, [pass.checkedInGuestCount]);

  useEffect(() => {
    const token = encodeURIComponent(pass.token);
    const source = new EventSource(`/api/check-in/pass/${token}/stream`);

    source.addEventListener("snapshot", (event) => {
      try {
        const next = JSON.parse((event as MessageEvent).data) as GuestPassPayload;
        if (next?.token) setPass(next);
      } catch {
        // ignore
      }
    });

    source.onerror = () => {
      // Browser will retry; polling fallback below covers gaps.
    };

    const poll = window.setInterval(() => {
      fetch(`/api/check-in/pass/${token}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data?.pass?.token) setPass(data.pass);
        })
        .catch(() => {});
    }, 4000);

    return () => {
      source.close();
      window.clearInterval(poll);
    };
  }, [pass.token]);

  return (
    <CheckInPassView
      pass={pass}
      showQrAgain={showQrAgain}
      onToggleShowQr={setShowQrAgain}
    />
  );
}

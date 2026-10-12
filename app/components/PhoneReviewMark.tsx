"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  PHONE_DUPLICATE_MESSAGE,
  PHONE_LENGTH_REVIEW_MESSAGE,
  phoneNeedsReview,
} from "@/lib/guestPhone";
import { usePhoneAvailability } from "@/app/components/usePhoneAvailability";

type ReviewGuest = {
  _id: string;
  name?: string;
  phone?: string;
  phoneNormalized?: string | null;
  phoneLengthApproved?: boolean;
  invitationId?: string;
};

type Props<T extends ReviewGuest> = {
  guest: T;
  invitationId?: string;
  onUpdated: (guest: T) => void | Promise<void>;
};

export default function PhoneReviewMark<T extends ReviewGuest>({
  guest,
  invitationId,
  onUpdated,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  if (!phoneNeedsReview(guest)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto relative z-20 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-black leading-none text-white"
        aria-label="מספר טלפון לבדיקה"
        title="מספר טלפון לבדיקה"
      >
        !
      </button>
      {open
        ? createPortal(
            <PhoneReviewDialog
              guest={guest}
              invitationId={invitationId || guest.invitationId}
              onClose={() => setOpen(false)}
              onUpdated={(next) => onUpdated({ ...guest, ...next } as T)}
            />,
            document.body
          )
        : null}
    </>
  );
}

function PhoneReviewDialog({
  guest,
  invitationId,
  onClose,
  onUpdated,
}: {
  guest: ReviewGuest;
  invitationId?: string;
  onClose: () => void;
  onUpdated: (guest: ReviewGuest) => void | Promise<void>;
}) {
  const [phone, setPhone] = useState(guest.phone || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const status = usePhoneAvailability({
    invitationId,
    phone,
    excludeGuestId: guest._id,
  });

  useEffect(() => {
    setPhone(guest.phone || "");
    setError("");
  }, [guest._id, guest.phone]);

  async function savePhone() {
    if (status.duplicate) {
      setError(PHONE_DUPLICATE_MESSAGE);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error || data?.message || "שגיאה בעדכון מספר הטלפון");
        return;
      }
      await onUpdated(
        data.guest || {
          ...guest,
          phone,
          requiresPhoneReview: phoneNeedsReview({ phone }),
        }
      );
      onClose();
    } catch {
      setError("שגיאה בעדכון מספר הטלפון");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvePhoneLength: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error || data?.message || "שגיאה בשמירת האישור");
        return;
      }
      await onUpdated(
        data.guest || {
          ...guest,
          phoneLengthApproved: true,
          requiresPhoneReview: false,
        }
      );
      onClose();
    } catch {
      setError("שגיאה בשמירת האישור");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[#E7DED1] bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-black text-[#241A14]">
          {guest.name || "רשומה"}
        </h3>
        <p className="mt-2 text-sm font-bold text-[#5F564D]" dir="ltr">
          {guest.phone || "—"}
        </p>
        <p className="mt-3 text-sm font-bold leading-6 text-[#7A6A59]">
          {PHONE_LENGTH_REVIEW_MESSAGE}
        </p>

        <label className="mt-4 block text-xs font-black text-[#6B5437]">
          תיקון מספר הטלפון
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-[#E3D6C3] px-3 text-left text-sm font-bold text-[#241A14] outline-none focus:border-[#B8844F]"
            dir="ltr"
          />
        </label>
        {status.duplicate ? (
          <p className="mt-2 text-xs font-bold text-red-600">
            {PHONE_DUPLICATE_MESSAGE}
          </p>
        ) : error ? (
          <p className="mt-2 text-xs font-bold text-red-600">{error}</p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void savePhone()}
            disabled={saving || status.duplicate}
            className="h-11 rounded-full bg-[#241A14] text-sm font-black text-white disabled:opacity-50"
          >
            תיקון מספר
          </button>
          <button
            type="button"
            onClick={() => void approve()}
            disabled={saving}
            className="h-11 rounded-full border border-[#E3D6C3] bg-white text-sm font-black text-[#6B5437] disabled:opacity-50"
          >
            בדקתי, המספר תקין
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 text-xs font-bold text-[#8A7B69]"
          >
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}

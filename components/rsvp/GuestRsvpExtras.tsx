"use client";

import { useState } from "react";
import type { GiftOptions, PublicEventNote } from "@/lib/rsvp/guestRsvpLogic";

async function copyBitPhone(phone: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(phone);
      return true;
    }
  } catch {
    // Fall through to the execCommand path used on some mobile browsers.
  }

  try {
    const field = document.createElement("textarea");
    field.value = phone;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "0";
    field.style.left = "0";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, phone.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}

const giftButtonClassName =
  "flex-1 min-w-[8.5rem] rounded-2xl border border-[#d8c7ad] bg-white py-3 text-center text-sm font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0]";

export function GiftSection({ giftOptions }: { giftOptions?: GiftOptions }) {
  const creditUrl = (giftOptions?.creditUrl ?? "").trim();
  const payboxUrl = (giftOptions?.payboxUrl ?? "").trim();
  const bitPhone = (giftOptions?.bitPhone ?? "").trim();

  const showCredit = !!giftOptions?.creditEnabled && !!creditUrl;
  const showPaybox = !!giftOptions?.payboxEnabled && !!payboxUrl;
  const showBit = !!giftOptions?.bitEnabled && !!bitPhone;

  const [bitCopied, setBitCopied] = useState(false);

  if (!showCredit && !showPaybox && !showBit) return null;

  async function handleCopyBit() {
    if (!bitPhone) return;
    const copied = await copyBitPhone(bitPhone);
    if (!copied) return;
    setBitCopied(true);
    window.setTimeout(() => setBitCopied(false), 2500);
  }

  return (
    <div className="rounded-[28px] border border-[#eadfce] bg-[#fffaf2] p-4 shadow-sm">
      <div className="mb-3 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          🎁
        </div>

        <p className="text-sm font-black text-[#3a2c20]">רוצים לשמח גם במתנה?</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {showCredit && (
          <a
            href={creditUrl}
            target="_blank"
            rel="noreferrer"
            className={giftButtonClassName}
          >
            מתנה באשראי
          </a>
        )}

        {showPaybox && (
          <a
            href={payboxUrl}
            target="_blank"
            rel="noreferrer"
            className={giftButtonClassName}
          >
            מתנה ב־PayBox
          </a>
        )}

        {showBit && (
          <button
            type="button"
            onClick={handleCopyBit}
            className={giftButtonClassName}
          >
            מתנה ב־Bit
          </button>
        )}
      </div>

      {bitCopied ? (
        <p className="mt-3 text-center text-sm font-bold text-[#5a4634]">
          מספר הטלפון ל־Bit הועתק בהצלחה ✓
        </p>
      ) : null}
    </div>
  );
}

export function PublicEventNoteSection({ note }: { note: PublicEventNote }) {
  if (!note.enabled || !note.text.trim()) return null;

  return (
    <section className="mt-7 w-full overflow-hidden rounded-[30px] border border-[#eadfce] bg-white/90 p-6 text-center shadow-[0_20px_70px_rgba(92,66,38,0.12)] backdrop-blur">
      <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-base font-bold leading-8 text-[#5a4634]">
        {note.text}
      </p>
    </section>
  );
}

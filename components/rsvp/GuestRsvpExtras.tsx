"use client";

import type { GiftOptions, PublicEventNote } from "@/lib/rsvp/guestRsvpLogic";

export function GiftSection({ giftOptions }: { giftOptions?: GiftOptions }) {
  const creditUrl = (giftOptions?.creditUrl ?? "").trim();
  const payboxUrl = (giftOptions?.payboxUrl ?? "").trim();

  const showCredit = !!giftOptions?.creditEnabled && !!creditUrl;
  const showPaybox = !!giftOptions?.payboxEnabled && !!payboxUrl;

  if (!showCredit && !showPaybox) return null;

  return (
    <div className="rounded-[28px] border border-[#eadfce] bg-[#fffaf2] p-4 shadow-sm">
      <div className="mb-3 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          🎁
        </div>

        <p className="text-sm font-black text-[#3a2c20]">רוצים לשמח גם במתנה?</p>
      </div>

      <div className="flex gap-3">
        {showCredit && (
          <a
            href={creditUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-2xl border border-[#d8c7ad] bg-white py-3 text-center text-sm font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0]"
          >
            מתנה באשראי
          </a>
        )}

        {showPaybox && (
          <a
            href={payboxUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-2xl border border-[#d8c7ad] bg-white py-3 text-center text-sm font-bold text-[#5a4634] shadow-sm transition hover:bg-[#fbf7f0]"
          >
            מתנה ב־PayBox
          </a>
        )}
      </div>
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

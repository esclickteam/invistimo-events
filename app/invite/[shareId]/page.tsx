"use client";

import { useState, useEffect, useMemo } from "react";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";
import EventLocationCard from "@/app/components/EventLocationCard";
import TransportationGuestSection from "@/app/components/TransportationGuestSection";
import GuestRsvpForm from "@/components/rsvp/GuestRsvpForm";
import { GiftSection, PublicEventNoteSection } from "@/components/rsvp/GuestRsvpExtras";
import { personalRsvpAppearance } from "@/components/rsvp/rsvpAppearances";
import { useGuestRsvpController } from "@/lib/rsvp/useGuestRsvpController";
import { cleanStr, type GiftOptions, type PublicEventNote } from "@/lib/rsvp/guestRsvpLogic";
import { resolveEventLocation } from "@/lib/navigationLinks";

type PreviewImageMode = "portrait" | "square";

function StaffPreviewCard({
  publicEventNote,
  giftOptions,
}: {
  publicEventNote: PublicEventNote;
  giftOptions?: GiftOptions;
}) {
  return (
    <section className="mt-7 w-full max-w-md overflow-hidden rounded-[34px] border border-[#eadfce] bg-white/92 p-6 text-center shadow-[0_28px_90px_rgba(92,66,38,0.16)] backdrop-blur">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ea] text-2xl">
        👀
      </div>

      <h2 className="text-2xl font-black leading-tight text-[#2d241c]">צפייה בהזמנה בלבד</h2>

      <p className="mx-auto mt-3 max-w-sm text-sm font-bold leading-7 text-[#6b6046]">
        זהו מצב צפייה לעובד מערכת. ניתן לראות איך ההזמנה נראית לאורחים,
        אבל אי אפשר לאשר הגעה או לשנות תשובה בשם אורח.
      </p>

      <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fffaf2] px-4 py-3 text-sm font-black text-[#8f6437]">
        טופס אישור ההגעה מוסתר במצב צפייה.
      </div>

      <PublicEventNoteSection note={publicEventNote} />

      <div className="mt-5">
        <GiftSection giftOptions={giftOptions} />
      </div>
    </section>
  );
}

function InvitationImageCard({
  imageUrl,
  imageMode,
  canvasData,
}: {
  imageUrl: string;
  imageMode: PreviewImageMode;
  canvasData?: any;
}) {
  return (
    <div className="w-full">
      {imageUrl ? (
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#dfc08f]/30 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/60 blur-3xl" />

          <div className="relative rounded-[34px] border border-white/80 bg-white/85 p-3 shadow-[0_30px_90px_rgba(92,66,38,0.16)] backdrop-blur">
            <div className="relative overflow-hidden rounded-[26px] bg-[#faf7f1]">
              <img
                src={imageUrl}
                alt="תמונת ההזמנה"
                className={`mx-auto block w-full rounded-[26px] object-contain ${
                  imageMode === "square" ? "aspect-square" : "aspect-[9/16]"
                }`}
              />

              <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-black/5" />
            </div>
          </div>
        </div>
      ) : canvasData ? (
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-[34px] bg-white p-3 shadow-[0_30px_90px_rgba(92,66,38,0.16)]">
          <div className="overflow-hidden rounded-[26px]">
            <PublicInviteRenderer canvasData={canvasData} />
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-[360px] w-full max-w-md items-center justify-center rounded-[30px] border border-dashed border-[#d1c7b4] bg-white/80 px-6 text-center text-sm text-[#6b6046]">
          תמונת ההזמנה לא זמינה כרגע
        </div>
      )}
    </div>
  );
}

export default function PublicInvitePage({ params }: any) {
  const rsvp = useGuestRsvpController({
    params,
    successMode: "personal",
  });

  const {
    loading,
    invite,
    event,
    isStaffPreview,
    selectedGuest,
    token,
    shareId,
    giftOptions,
    publicEventNote,
  } = rsvp;

  const [previewOverrideImage, setPreviewOverrideImage] = useState("");
  const [previewOverrideMode, setPreviewOverrideMode] =
    useState<PreviewImageMode | null>(null);

  useEffect(() => {
    function handlePreviewMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "INVISTIMO_PREVIEW_IMAGE_UPDATE") return;

      const nextImageUrl =
        typeof event.data.imageUrl === "string" ? event.data.imageUrl : "";

      const nextMode = event.data.imageMode === "square" ? "square" : "portrait";

      setPreviewOverrideImage(nextImageUrl);
      setPreviewOverrideMode(nextMode);
    }

    window.addEventListener("message", handlePreviewMessage);

    return () => {
      window.removeEventListener("message", handlePreviewMessage);
    };
  }, []);

  const invitationImageUrl = useMemo(() => {
    return (
      previewOverrideImage ||
      invite?.previewImageUrl ||
      invite?.headerImageUrl ||
      invite?.imageUrl ||
      invite?.canvasImageUrl ||
      ""
    );
  }, [previewOverrideImage, invite]);

  const invitationImageMode: PreviewImageMode = useMemo(() => {
    if (previewOverrideMode) return previewOverrideMode;
    if (invite?.orientation === "square") return "square";
    return "portrait";
  }, [previewOverrideMode, invite]);

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7efe5]">
        <div className="rounded-[30px] border border-[#eadfce] bg-white px-8 py-7 text-center shadow-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#d7b98b] border-t-transparent" />
          <p className="text-lg font-bold text-[#3b2a1f]">טוען הזמנה…</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7efe5] p-6">
        <div className="rounded-[30px] border border-red-100 bg-white px-8 py-7 text-center text-red-600 shadow-xl">
          ❌ ההזמנה לא נמצאה
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen overflow-hidden bg-[#f7efe5]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#dfc08f]/30 blur-3xl" />
        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-white/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#c79a55]/10 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-4 py-8 pb-28">
        <section className="mb-6 w-full max-w-md text-center">
          <div className="mx-auto mb-4 h-px w-28 bg-gradient-to-l from-transparent via-[#c79a55] to-transparent" />

          <p className="text-xs font-bold tracking-[0.24em] text-[#b58a55]">הזמנה לאירוע</p>

          <h1 className="mt-3 text-3xl font-black leading-tight text-[#2d241c]">
            {invite?.title || "שמחים להזמינכם"}
          </h1>

          <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-l from-transparent via-[#d7b98b] to-transparent" />
        </section>

        {isStaffPreview && (
          <section className="mb-5 w-full max-w-md rounded-[24px] border border-[#d7b98b] bg-[#fffaf2] px-5 py-4 text-center shadow-sm">
            <p className="text-sm font-black text-[#8f6437]">מצב צפייה לעובד מערכת</p>
            <p className="mt-1 text-xs font-bold leading-6 text-[#6b6046]">
              העובד רואה את ההזמנה בלבד. אישור הגעה חסום במסך הזה.
            </p>
          </section>
        )}

        <InvitationImageCard
          imageUrl={invitationImageUrl}
          imageMode={invitationImageMode}
          canvasData={invite.canvasData}
        />

        {isStaffPreview ? (
          <StaffPreviewCard publicEventNote={publicEventNote} giftOptions={giftOptions} />
        ) : (
          <GuestRsvpForm
            controller={rsvp}
            appearance={personalRsvpAppearance}
            showHeading
            showTransportation={false}
            showGiftAndNote
            allowUpdateAfterSubmit={false}
          />
        )}

        {shareId && !isStaffPreview && (
          <TransportationGuestSection
            shareId={shareId}
            guestToken={cleanStr(selectedGuest?.token || token) || undefined}
          />
        )}

        <div className="mt-7 w-full max-w-md">
          <EventLocationCard
            shareId={shareId}
            location={resolveEventLocation(invite, event)}
          />
        </div>

        <footer className="mt-10 flex flex-col items-center gap-2 pb-4 text-center">
          <div className="h-px w-24 bg-gradient-to-l from-transparent via-[#d7b98b] to-transparent" />

          <div className="font-serif text-2xl font-black tracking-wide text-[#3a2c20]">Invistimo</div>

          <p className="text-[11px] font-medium text-[#9a8771]">Digital invitation & RSVP</p>
        </footer>
      </main>
    </div>
  );
}

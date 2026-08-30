"use client";

import GuestRsvpForm from "@/components/rsvp/GuestRsvpForm";
import { getRsvpAppearance } from "@/components/rsvp/rsvpAppearances";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import { RSVP_COPY } from "@/lib/rsvp/guestRsvpLogic";
import {
  useGuestRsvpDemoController,
  type GuestRsvpController,
} from "@/lib/rsvp/useGuestRsvpController";

type Props = {
  templateId: string;
  controller?: GuestRsvpController | null;
  showHeading?: boolean;
};

const DEFAULT_RSVP_NOTE =
  "האירוע מתקיים בהתאם להנחיות פיקוד העורף, יש מרחב מוגן במקום.";

export default function WeddingTemplateRsvp({
  templateId,
  controller,
  showHeading = false,
}: Props) {
  const site = useWeddingSite();
  const demo = useGuestRsvpDemoController();
  const rsvp = controller || demo;
  const isLive = Boolean(controller?.shareId);
  const isEditor = site?.mode === "editor";
  const appearance = getRsvpAppearance(templateId);
  const copy = {
    heading: site?.content.rsvpSubtitle || RSVP_COPY.heading,
    success: site?.content.rsvpSuccessMessage || RSVP_COPY.success,
    updateLabel: site?.content.rsvpUpdateLabel || "רוצים לעדכן?",
    yesLabel: site?.content.rsvpYesLabel || RSVP_COPY.yesLabel,
    noLabel: site?.content.rsvpNoLabel || RSVP_COPY.noLabel,
    submitLabel: site?.content.rsvpSubmitLabel || RSVP_COPY.submit,
    countLabel: site?.content.rsvpCountLabel || RSVP_COPY.countLabel,
    notesLabel: site?.content.rsvpNotesLabel || RSVP_COPY.notesLabel,
    publicNote: site?.content.rsvpNote || (isEditor ? DEFAULT_RSVP_NOTE : ""),
  };

  if (controller?.loading) {
    return (
      <p className="py-6 text-center text-sm opacity-70" data-rsvp-core="1" data-rsvp-state="loading">
        טוען אישור הגעה…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <GuestRsvpForm
        controller={rsvp}
        appearance={appearance}
        showHeading={showHeading}
        showTransportation={isLive && !isEditor}
        showGiftAndNote
        allowUpdateAfterSubmit
        copy={copy}
        editable={isEditor}
      />

      {isEditor ? (
        <div data-ww-thankyou-preview="1">
          <p className="mb-3 text-center text-[11px] font-black tracking-wide opacity-55">
            תצוגת דף תודה — ערכו כאן טקסט וצבעים
          </p>
          <GuestRsvpForm
            controller={rsvp}
            appearance={appearance}
            showHeading={false}
            showTransportation={false}
            showGiftAndNote={false}
            allowUpdateAfterSubmit
            copy={copy}
            forceSent
            editable
          />
        </div>
      ) : null}
    </div>
  );
}

"use client";

import GuestRsvpForm from "@/components/rsvp/GuestRsvpForm";
import { getRsvpAppearance } from "@/components/rsvp/rsvpAppearances";
import {
  useGuestRsvpDemoController,
  type GuestRsvpController,
} from "@/lib/rsvp/useGuestRsvpController";

type Props = {
  templateId: string;
  controller?: GuestRsvpController | null;
  showHeading?: boolean;
};

export default function WeddingTemplateRsvp({
  templateId,
  controller,
  showHeading = false,
}: Props) {
  const demo = useGuestRsvpDemoController();
  const rsvp = controller || demo;
  const isLive = Boolean(controller?.shareId);

  if (controller?.loading) {
    return (
      <p className="py-6 text-center text-sm opacity-70" data-rsvp-core="1" data-rsvp-state="loading">
        טוען אישור הגעה…
      </p>
    );
  }

  return (
    <GuestRsvpForm
      controller={rsvp}
      appearance={getRsvpAppearance(templateId)}
      showHeading={showHeading}
      showTransportation={isLive}
      showGiftAndNote={isLive}
      allowUpdateAfterSubmit
    />
  );
}

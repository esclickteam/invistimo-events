"use client";

import WhatsappRoundsReportModal from "@/app/components/WhatsappRoundsReportModal";

/**
 * Dashboard entry for the WhatsApp rounds report.
 * Uses the shared guest-centric report modal.
 */
export default function WhatsappRoundReport({
  invitationId,
  onClose,
}: {
  invitationId: string;
  onClose: () => void;
}) {
  return (
    <WhatsappRoundsReportModal
      invitationId={invitationId}
      onClose={onClose}
    />
  );
}

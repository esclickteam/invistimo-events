"use client";

import SmsRoundsReportModal from "@/app/components/SmsRoundsReportModal";

/**
 * Dashboard entry for the SMS4FREE rounds report.
 */
export default function SmsRoundReport({
  invitationId,
  onClose,
}: {
  invitationId: string;
  onClose: () => void;
}) {
  return (
    <SmsRoundsReportModal invitationId={invitationId} onClose={onClose} />
  );
}

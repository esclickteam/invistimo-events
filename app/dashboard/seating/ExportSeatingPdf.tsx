"use client";

import { Button } from "@/components/ui/button";

export default function ExportSeatingPdf({ eventId }: { eventId: string | null }) {
  const exportPdf = () => {
    if (!eventId) return;
    window.open(`/dashboard/seating/print?eventId=${eventId}`, "_blank");
  };

  return (
    <Button variant="outline" onClick={exportPdf} disabled={!eventId}>
      📄 ייצוא ל-PDF
    </Button>
  );
}

"use client";

import { Button } from "@/components/ui/button";

export default function ExportSeatingPdf() {
  const exportPdf = () => {
    // עמוד ההדפסה יודע להביא נתונים מה-store
    window.open("/dashboard/seating/print", "_blank");
  };

  return (
    <Button variant="outline" onClick={exportPdf}>
      📄 ייצוא ל-PDF
    </Button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useSeatingStore } from "@/store/seatingStore";
import {
  buildSeatingPdf,
  buildSeatingSummary,
  canvasToBlob,
  downloadBlob,
  saveSeatingMapForPrint,
} from "./seatingExport";

type ExportKind = "map-pdf" | "map-png" | "map-jpg" | "guests-pdf" | "print";

type ExportSeatingPdfProps = {
  eventId: string | null;
};

declare global {
  interface Window {
    __captureInvistimoSeatingMap?: () => HTMLCanvasElement | null;
  }
}

const MAP_MISSING_MESSAGE =
  "לא הצלחתי ליצור תמונה של המפה. ודאי שהמפה מוצגת במסך ונסי שוב.";

/** setTimeout rather than rAF: rAF never fires once the print tab takes focus. */
function waitForPaint() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 60));
}

export default function ExportSeatingPdf({ eventId }: ExportSeatingPdfProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [working, setWorking] = useState<ExportKind | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !working) setIsExportMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExportMenuOpen, working]);

  const fileBase = `seating-map-${eventId || "event"}`;

  const captureMap = () => {
    if (typeof window === "undefined") return null;
    return window.__captureInvistimoSeatingMap?.() ?? null;
  };

  const getSummary = () => {
    const { tables, guests } = useSeatingStore.getState() as {
      tables: any[];
      guests: any[];
    };
    return buildSeatingSummary(tables || [], guests || []);
  };

  const handleExport = async (kind: ExportKind) => {
    if (working) return;

    const printWindow =
      kind === "print" ? window.open("about:blank", "_blank") : null;

    setWorking(kind);

    try {
      await waitForPaint();

      const mapCanvas = captureMap();
      if (!mapCanvas) {
        printWindow?.close();
        alert(MAP_MISSING_MESSAGE);
        return;
      }

      if (kind === "map-png") {
        downloadBlob(await canvasToBlob(mapCanvas, "image/png"), `${fileBase}.png`);
      } else if (kind === "map-jpg") {
        downloadBlob(
          await canvasToBlob(mapCanvas, "image/jpeg", 0.95),
          `${fileBase}.jpg`
        );
      } else if (kind === "map-pdf" || kind === "guests-pdf") {
        const includeGuests = kind === "guests-pdf";
        const pdf = await buildSeatingPdf({
          mapCanvas,
          tables: getSummary(),
          includeGuests,
        });
        downloadBlob(
          pdf,
          includeGuests ? `${fileBase}-with-guests.pdf` : `${fileBase}.pdf`
        );
      } else if (kind === "print") {
        await saveSeatingMapForPrint(
          await canvasToBlob(mapCanvas, "image/png"),
          eventId
        );

        const params = new URLSearchParams();
        if (eventId) params.set("eventId", eventId);
        params.set("includeGuests", "1");
        params.set("format", "pdf");
        params.set("mode", "print");
        const url = `/dashboard/seating/print?${params.toString()}`;

        if (printWindow && !printWindow.closed) {
          printWindow.location.href = url;
        } else {
          window.location.href = url;
        }
      }

      mapCanvas.width = 0;
      mapCanvas.height = 0;
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error("Seating export failed:", error);
      printWindow?.close();
      alert("הייצוא נכשל. נסי שוב.");
    } finally {
      setWorking(null);
    }
  };

  const renderOption = (
    kind: ExportKind,
    title: string,
    subtitle: string,
    icon: string
  ) => (
    <button
      key={kind}
      type="button"
      onClick={() => void handleExport(kind)}
      disabled={!!working}
      className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl border border-[#EFE3D4] bg-white px-4 py-3 text-right transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex min-w-0 flex-col">
        <span className="text-base font-black text-[#2F241C]">
          {working === kind ? "מייצא…" : title}
        </span>
        <span className="mt-1 text-xs font-bold text-[#8A7A68]">{subtitle}</span>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-lg">
        {icon}
      </div>
    </button>
  );

  return (
    <>
      <Button
        variant="outline"
        type="button"
        onClick={() => setIsExportMenuOpen(true)}
        disabled={!!working}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E4D4BE] bg-white px-5 py-3 text-sm font-black text-[#3B2A1D] shadow-sm transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        📤 ייצוא PDF
      </Button>

      {isExportMenuOpen && isMounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ייצוא מפת שולחנות"
          className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/45 p-3 sm:p-6"
          onClick={() => !working && setIsExportMenuOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-[32px]"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#EFE3D4] px-4 py-4 sm:px-5">
              <div>
                <h3 className="text-xl font-black text-[#2F241C]">
                  ייצוא מפת שולחנות
                </h3>

                <p className="mt-1 text-sm font-semibold text-[#8A7A68]">
                  הקובץ יורד ישירות למכשיר
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsExportMenuOpen(false)}
                disabled={!!working}
                className="shrink-0 rounded-full bg-[#F6F1EA] px-4 py-2 text-sm font-black text-[#3F2F1F] transition hover:bg-[#EFE3D4] disabled:opacity-50"
              >
                סגור
              </button>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto overscroll-contain p-4 sm:p-5 md:grid-cols-2">
              <section className="rounded-[28px] border border-[#EFE3D4] bg-[#FCFAF7] p-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black text-[#2F241C]">
                      רק מפת שולחנות
                    </h4>
                    <span className="rounded-full bg-[#18213D] px-2.5 py-1 text-xs font-black text-white">
                      מומלץ
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold leading-5 text-[#8A7A68]">
                    כל המפה כולל תמונת האולם, השולחנות, הכיסאות והשמות.
                  </p>
                </div>

                <div className="grid gap-2">
                  {renderOption("map-pdf", "ייצוא PDF", "קובץ PDF להדפסה", "📄")}
                  {renderOption("map-png", "ייצוא PNG", "תמונה באיכות גבוהה", "🖼️")}
                  {renderOption("map-jpg", "ייצוא JPG", "תמונה קלה לשליחה", "🖼️")}
                </div>
              </section>

              <section className="rounded-[28px] border border-[#EFE3D4] bg-[#FCFAF7] p-4">
                <div className="mb-4">
                  <h4 className="text-lg font-black text-[#2F241C]">
                    מפה + רשימת אורחים
                  </h4>
                  <p className="mt-1 text-xs font-bold leading-5 text-[#8A7A68]">
                    עמוד מפה ואחריו פירוט אורחים לפי שולחנות.
                  </p>
                </div>

                <div className="grid gap-2">
                  {renderOption(
                    "guests-pdf",
                    "ייצוא PDF",
                    "מפה + רשימת אורחים לפי שולחנות",
                    "📄"
                  )}
                  {renderOption(
                    "print",
                    "תצוגת הדפסה",
                    "פתיחה בלשונית חדשה להדפסה",
                    "🖨️"
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

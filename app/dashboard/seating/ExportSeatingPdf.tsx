"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ExportContentType = "map-only" | "with-guests";

type ExportSeatingPdfProps = {
  eventId: string | null;
  getMapImageDataUrl?: () => string | null;
};

declare global {
  interface Window {
    __getInvistimoSeatingMapImage?: () => string | null;
    __saveInvistimoSeatingMapImage?: () => string | null;
  }
}

export default function ExportSeatingPdf({
  eventId,
  getMapImageDataUrl,
}: ExportSeatingPdfProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const getRealMapImage = () => {
    try {
      if (getMapImageDataUrl) {
        const image = getMapImageDataUrl();
        if (image) return image;
      }

      if (
        typeof window !== "undefined" &&
        typeof window.__saveInvistimoSeatingMapImage === "function"
      ) {
        const image = window.__saveInvistimoSeatingMapImage();
        if (image) return image;
      }

      if (
        typeof window !== "undefined" &&
        typeof window.__getInvistimoSeatingMapImage === "function"
      ) {
        const image = window.__getInvistimoSeatingMapImage();
        if (image) return image;
      }

      return null;
    } catch (error) {
      console.error("Failed getting seating map image:", error);
      return null;
    }
  };

  const saveRealMapImage = () => {
    try {
      sessionStorage.removeItem("seatingMapImage");

      const image = getRealMapImage();

      if (image) {
        sessionStorage.setItem("seatingMapImage", image);
        return image;
      }

      return null;
    } catch (error) {
      console.error("Failed saving seating map image:", error);
      return null;
    }
  };

  const openPdfExport = (contentType: ExportContentType) => {
    if (!eventId || isWorking) return;

    try {
      setIsWorking(true);

      const image = saveRealMapImage();

      if (!image) {
        alert("לא הצלחתי לקחת תמונה של המפה. נסי שוב מתוך עמוד ההושבה.");
        return;
      }

      const params = new URLSearchParams();

      params.set("eventId", eventId);
      params.set("includeGuests", contentType === "with-guests" ? "1" : "0");
      params.set("format", "pdf");
      params.set("mode", "print");

      window.open(`/dashboard/seating/print?${params.toString()}`, "_blank");
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("הייצוא נכשל. נסי שוב.");
    } finally {
      setIsWorking(false);
    }
  };

  const PdfOption = ({
    title,
    description,
    icon,
    badge,
    onClick,
  }: {
    title: string;
    description: string;
    icon: string;
    badge?: string;
    onClick: () => void;
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isWorking}
        className="flex min-h-[118px] w-full items-center gap-4 rounded-3xl border border-[#EFE3D4] bg-white p-5 text-right transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-3xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-[#2F241C]">
              {title}
            </span>

            {badge ? (
              <span className="rounded-full bg-[#18213D] px-2.5 py-1 text-xs font-black text-white">
                {badge}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm font-bold leading-6 text-[#8A7A68]">
            {description}
          </p>
        </div>
      </button>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        type="button"
        onClick={() => setIsExportMenuOpen(true)}
        disabled={!eventId || isWorking}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E4D4BE] bg-white px-5 py-3 text-sm font-black text-[#3B2A1D] shadow-sm transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        📄 ייצוא PDF
      </Button>

      {isExportMenuOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setIsExportMenuOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-[32px] bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#EFE3D4] pb-4">
              <div className="min-w-0">
                <h3 className="text-xl font-black text-[#2F241C]">
                  ייצוא PDF
                </h3>

                <p className="mt-1 text-sm font-semibold text-[#8A7A68]">
                  בחרי מה להכניס לקובץ ה־PDF
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsExportMenuOpen(false)}
                className="shrink-0 rounded-full bg-[#F6F1EA] px-4 py-2 text-sm font-black text-[#3F2F1F] transition hover:bg-[#EFE3D4]"
              >
                סגור
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PdfOption
                icon="🪑"
                title="רק מפת שולחנות"
                badge="מומלץ"
                description="המפה בלבד, בעמוד אחד, בלי רשימת אורחים."
                onClick={() => openPdfExport("map-only")}
              />

              <PdfOption
                icon="👥"
                title="מפה + רשימת אורחים"
                description="מפת שולחנות ולאחריה פירוט אורחים לפי שולחנות."
                onClick={() => openPdfExport("with-guests")}
              />
            </div>

            <div className="mt-5 rounded-2xl bg-[#FCFAF7] px-4 py-3 text-center text-xs font-bold text-[#8A7A68]">
              אחרי הלחיצה ייפתח חלון הדפסה — לבחור שם Save as PDF / שמירה כ־PDF.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
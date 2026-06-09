"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ExportFormat = "png" | "jpg" | "pdf-standard" | "pdf-print";

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

  const saveRealMapImage = () => {
    try {
      sessionStorage.removeItem("seatingMapImage");

      if (getMapImageDataUrl) {
        const image = getMapImageDataUrl();

        if (image) {
          sessionStorage.setItem("seatingMapImage", image);
          return;
        }
      }

      if (
        typeof window !== "undefined" &&
        typeof window.__saveInvistimoSeatingMapImage === "function"
      ) {
        const image = window.__saveInvistimoSeatingMapImage();

        if (image) {
          sessionStorage.setItem("seatingMapImage", image);
        }

        return;
      }

      if (
        typeof window !== "undefined" &&
        typeof window.__getInvistimoSeatingMapImage === "function"
      ) {
        const image = window.__getInvistimoSeatingMapImage();

        if (image) {
          sessionStorage.setItem("seatingMapImage", image);
        }
      }
    } catch (error) {
      console.error("Failed saving seating map image:", error);
    }
  };

  const openExport = (format: ExportFormat) => {
    if (!eventId) return;

    saveRealMapImage();

    const params = new URLSearchParams();
    params.set("eventId", eventId);

    if (format === "png") {
      params.set("format", "png");
    }

    if (format === "jpg") {
      params.set("format", "jpg");
    }

    if (format === "pdf-standard") {
      params.set("format", "pdf");
      params.set("mode", "standard");
    }

    if (format === "pdf-print") {
      params.set("format", "pdf");
      params.set("mode", "print");
    }

    window.open(`/dashboard/seating/print?${params.toString()}`, "_blank");
    setIsExportMenuOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        type="button"
        onClick={() => setIsExportMenuOpen(true)}
        disabled={!eventId}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E4D4BE] bg-white px-5 py-3 text-sm font-black text-[#3B2A1D] shadow-sm transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        📤 ייצוא מפה
      </Button>

      {isExportMenuOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/45 md:items-center"
          onClick={() => setIsExportMenuOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-t-[32px] bg-white p-5 shadow-2xl md:rounded-[32px]"
          >
            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[#D8D2CA] md:hidden" />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-[#2F241C]">
                  ייצוא מפת שולחנות
                </h3>

                <p className="mt-1 text-sm font-semibold text-[#8A7A68]">
                  בחרי באיזה פורמט להוריד את המפה ורשימת האורחים
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsExportMenuOpen(false)}
                className="rounded-full bg-[#F6F1EA] px-4 py-2 text-sm font-black text-[#3F2F1F] transition hover:bg-[#EFE3D4]"
              >
                סגור
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#EFE3D4] bg-white">
              <button
                type="button"
                onClick={() => openExport("png")}
                className="flex w-full items-center gap-4 border-b border-[#EFE3D4] bg-white p-5 text-right transition hover:bg-[#FFF8EF]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
                  🖼️
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-[#2F241C]">
                      PNG
                    </span>

                    <span className="rounded-full bg-[#18213D] px-2.5 py-1 text-xs font-black text-white">
                      מומלץ
                    </span>
                  </div>

                  <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                    תמונה איכותית של המפה + רשימת האורחים
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openExport("jpg")}
                className="flex w-full items-center gap-4 border-b border-[#EFE3D4] bg-white p-5 text-right transition hover:bg-[#FFF8EF]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
                  🖼️
                </div>

                <div className="flex-1">
                  <div className="text-lg font-black text-[#2F241C]">JPG</div>

                  <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                    קובץ קל לשליחה ושיתוף
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openExport("pdf-standard")}
                className="flex w-full items-center gap-4 border-b border-[#EFE3D4] bg-white p-5 text-right transition hover:bg-[#FFF8EF]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
                  📄
                </div>

                <div className="flex-1">
                  <div className="text-lg font-black text-[#2F241C]">
                    PDF רגיל
                  </div>

                  <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                    מתאים לשליחה במייל או וואטסאפ
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openExport("pdf-print")}
                className="flex w-full items-center gap-4 bg-white p-5 text-right transition hover:bg-[#FFF8EF]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
                  🖨️
                </div>

                <div className="flex-1">
                  <div className="text-lg font-black text-[#2F241C]">
                    PDF להדפסה
                  </div>

                  <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                    איכות גבוהה להדפסה באולם
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
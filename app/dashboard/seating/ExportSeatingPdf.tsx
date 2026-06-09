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

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function convertPngDataUrlToJpg(dataUrl: string, quality = 0.98): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => reject(new Error("Failed converting image to JPG"));
    image.src = dataUrl;
  });
}

export default function ExportSeatingPdf({
  eventId,
  getMapImageDataUrl,
}: ExportSeatingPdfProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [includeGuests, setIncludeGuests] = useState(true);
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

  const openExport = async (format: ExportFormat) => {
    if (!eventId || isWorking) return;

    try {
      setIsWorking(true);

      const image = saveRealMapImage();

      if (!includeGuests && (format === "png" || format === "jpg")) {
        if (!image) {
          alert("לא הצלחתי לקחת תמונה של המפה. נסי שוב.");
          return;
        }

        if (format === "png") {
          downloadDataUrl(image, `seating-map-${eventId}.png`);
        } else {
          const jpgDataUrl = await convertPngDataUrlToJpg(image, 0.98);
          downloadDataUrl(jpgDataUrl, `seating-map-${eventId}.jpg`);
        }

        setIsExportMenuOpen(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("eventId", eventId);
      params.set("includeGuests", includeGuests ? "1" : "0");

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
    } catch (error) {
      console.error("Export failed:", error);
      alert("הייצוא נכשל. נסי שוב.");
    } finally {
      setIsWorking(false);
    }
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
                  אפשר לייצא רק את המפה או מפה + רשימת אורחים
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

            <div className="mb-5 rounded-3xl border border-[#EFE3D4] bg-[#FCFAF7] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={includeGuests}
                  onChange={(e) => setIncludeGuests(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-[#CDBBA2]"
                />

                <div>
                  <div className="text-sm font-black text-[#2F241C]">
                    לכלול גם רשימת אורחים לפי שולחנות
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[#7A6A5A]">
                    אם לא מסומן — ייוצא רק צילום המפה באיכות המקסימלית
                  </div>
                </div>
              </label>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#EFE3D4] bg-white">
              <button
                type="button"
                onClick={() => void openExport("png")}
                disabled={isWorking}
                className="flex w-full items-center gap-4 border-b border-[#EFE3D4] bg-white p-5 text-right transition hover:bg-[#FFF8EF] disabled:opacity-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
                  🖼️
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-[#2F241C]">PNG</span>
                    <span className="rounded-full bg-[#18213D] px-2.5 py-1 text-xs font-black text-white">
                      הכי חד
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                    {includeGuests
                      ? "מפה + רשימת אורחים"
                      : "רק מפה באיכות הגבוהה ביותר"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => void openExport("jpg")}
                disabled={isWorking}
                className="flex w-full items-center gap-4 border-b border-[#EFE3D4] bg-white p-5 text-right transition hover:bg-[#FFF8EF] disabled:opacity-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
                  🖼️
                </div>

                <div className="flex-1">
                  <div className="text-lg font-black text-[#2F241C]">JPG</div>
                  <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                    {includeGuests
                      ? "מפה + רשימת אורחים"
                      : "רק מפה בקובץ קל יותר לשיתוף"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => void openExport("pdf-standard")}
                disabled={isWorking}
                className="flex w-full items-center gap-4 border-b border-[#EFE3D4] bg-white p-5 text-right transition hover:bg-[#FFF8EF] disabled:opacity-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
                  📄
                </div>

                <div className="flex-1">
                  <div className="text-lg font-black text-[#2F241C]">PDF רגיל</div>
                  <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                    יפתח חלון הדפסה — שם לבחור Save as PDF
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => void openExport("pdf-print")}
                disabled={isWorking}
                className="flex w-full items-center gap-4 bg-white p-5 text-right transition hover:bg-[#FFF8EF] disabled:opacity-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
                  🖨️
                </div>

                <div className="flex-1">
                  <div className="text-lg font-black text-[#2F241C]">PDF להדפסה</div>
                  <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                    מותאם יותר להדפסה באולם
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
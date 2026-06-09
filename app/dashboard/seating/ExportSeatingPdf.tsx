"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ExportContentType = "map-only" | "with-guests";
type ExportFileType = "png" | "jpg" | "pdf";

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

function convertPngDataUrlToJpg(
  dataUrl: string,
  quality = 0.99
): Promise<string> {
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

  const openPrintExport = (
    contentType: ExportContentType,
    fileType: ExportFileType
  ) => {
    if (!eventId) return;

    const params = new URLSearchParams();
    params.set("eventId", eventId);
    params.set("includeGuests", contentType === "with-guests" ? "1" : "0");
    params.set("format", fileType);

    if (fileType === "pdf") {
      params.set("mode", "print");
    }

    window.open(`/dashboard/seating/print?${params.toString()}`, "_blank");
  };

  const handleExport = async (
    contentType: ExportContentType,
    fileType: ExportFileType
  ) => {
    if (!eventId || isWorking) return;

    try {
      setIsWorking(true);

      const image = saveRealMapImage();

      /*
        הכי איכותי:
        רק מפה + PNG/JPG יורד ישירות מהתמונה האמיתית של Konva,
        בלי html2canvas ובלי צילום של הדף.
      */
      if (
        contentType === "map-only" &&
        (fileType === "png" || fileType === "jpg")
      ) {
        if (!image) {
          alert("לא הצלחתי לקחת תמונה של המפה. נסי שוב מתוך עמוד ההושבה.");
          return;
        }

        if (fileType === "png") {
          downloadDataUrl(image, `seating-map-${eventId}.png`);
        }

        if (fileType === "jpg") {
          const jpgDataUrl = await convertPngDataUrlToJpg(image, 0.99);
          downloadDataUrl(jpgDataUrl, `seating-map-${eventId}.jpg`);
        }

        setIsExportMenuOpen(false);
        return;
      }

      /*
        מפה + אורחים / PDF:
        עובר לעמוד print כדי לבנות מסמך עם רשימת האורחים.
      */
      openPrintExport(contentType, fileType);
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert("הייצוא נכשל. נסי שוב.");
    } finally {
      setIsWorking(false);
    }
  };

  const ExportRow = ({
    icon,
    title,
    description,
    badge,
    onClick,
  }: {
    icon: string;
    title: string;
    description: string;
    badge?: string;
    onClick: () => void;
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isWorking}
        className="flex w-full items-center gap-4 border-b border-[#EFE3D4] bg-white p-5 text-right transition last:border-b-0 hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-2xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-[#2F241C]">{title}</span>

            {badge ? (
              <span className="rounded-full bg-[#18213D] px-2.5 py-1 text-xs font-black text-white">
                {badge}
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-sm font-semibold text-[#7A6A5A]">
            {description}
          </div>
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
        📤 ייצוא מפה
      </Button>

      {isExportMenuOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setIsExportMenuOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[82dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl"
          >
            <div className="border-b border-[#EFE3D4] bg-white px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-[#2F241C]">
                    ייצוא מפת שולחנות
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-[#8A7A68]">
                    בחרי אם לייצא רק מפה או מפה עם רשימת אורחים
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
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <section className="overflow-hidden rounded-3xl border border-[#EFE3D4] bg-white">
                <div className="border-b border-[#EFE3D4] bg-[#FCFAF7] px-5 py-4">
                  <h4 className="text-base font-black text-[#2F241C]">
                    רק מפת שולחנות
                  </h4>

                  <p className="mt-1 text-xs font-bold text-[#8A7A68]">
                    הכי חד — מוריד את התמונה המקורית של המפה בלי צילום מסך של הדף
                  </p>
                </div>

                <ExportRow
                  icon="🖼️"
                  title="PNG"
                  badge="הכי חד"
                  description="רק המפה באיכות הגבוהה ביותר"
                  onClick={() => void handleExport("map-only", "png")}
                />

                <ExportRow
                  icon="🌄"
                  title="JPG"
                  description="רק המפה בקובץ קל יותר לשליחה"
                  onClick={() => void handleExport("map-only", "jpg")}
                />

                <ExportRow
                  icon="📄"
                  title="PDF"
                  description="רק המפה — יפתח חלון הדפסה לשמירה כ-PDF"
                  onClick={() => void handleExport("map-only", "pdf")}
                />
              </section>

              <section className="overflow-hidden rounded-3xl border border-[#EFE3D4] bg-white">
                <div className="border-b border-[#EFE3D4] bg-[#FCFAF7] px-5 py-4">
                  <h4 className="text-base font-black text-[#2F241C]">
                    מפה + רשימת אורחים
                  </h4>

                  <p className="mt-1 text-xs font-bold text-[#8A7A68]">
                    כולל תמונת מפה אמיתית ופירוט אורחים לפי שולחנות
                  </p>
                </div>

                <ExportRow
                  icon="🖼️"
                  title="PNG"
                  badge="מומלץ"
                  description="מפה + רשימת אורחים בתמונה אחת"
                  onClick={() => void handleExport("with-guests", "png")}
                />

                <ExportRow
                  icon="🌄"
                  title="JPG"
                  description="מפה + רשימת אורחים בקובץ קל לשיתוף"
                  onClick={() => void handleExport("with-guests", "jpg")}
                />

                <ExportRow
                  icon="📄"
                  title="PDF"
                  description="מפה + רשימת אורחים — לשמירה כ-PDF"
                  onClick={() => void handleExport("with-guests", "pdf")}
                />
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
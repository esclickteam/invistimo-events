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

      openPrintExport(contentType, fileType);
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert("הייצוא נכשל. נסי שוב.");
    } finally {
      setIsWorking(false);
    }
  };

  const MiniExportButton = ({
    icon,
    title,
    badge,
    onClick,
  }: {
    icon: string;
    title: string;
    badge?: string;
    onClick: () => void;
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isWorking}
        className="flex min-h-[78px] w-full items-center justify-between gap-3 rounded-2xl border border-[#EFE3D4] bg-white px-4 py-3 text-right transition hover:bg-[#FFF8EF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-[#2F241C]">
              {title}
            </span>

            {badge ? (
              <span className="rounded-full bg-[#18213D] px-2 py-0.5 text-[11px] font-black text-white">
                {badge}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-xl">
          {icon}
        </div>
      </button>
    );
  };

  const ExportCard = ({
    title,
    description,
    contentType,
    isRecommended,
  }: {
    title: string;
    description: string;
    contentType: ExportContentType;
    isRecommended?: boolean;
  }) => {
    return (
      <section className="rounded-[28px] border border-[#EFE3D4] bg-[#FCFAF7] p-4">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-black text-[#2F241C]">{title}</h4>

            {isRecommended ? (
              <span className="rounded-full bg-[#18213D] px-2.5 py-1 text-xs font-black text-white">
                מומלץ
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs font-bold leading-5 text-[#8A7A68]">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniExportButton
            icon="🖼️"
            title="PNG"
            badge={contentType === "map-only" ? "הכי חד" : undefined}
            onClick={() => void handleExport(contentType, "png")}
          />

          <MiniExportButton
            icon="🌄"
            title="JPG"
            onClick={() => void handleExport(contentType, "jpg")}
          />

          <MiniExportButton
            icon="📄"
            title="PDF"
            onClick={() => void handleExport(contentType, "pdf")}
          />
        </div>
      </section>
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
            className="w-full max-w-4xl rounded-[32px] bg-white p-5 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#EFE3D4] pb-4">
              <div>
                <h3 className="text-xl font-black text-[#2F241C]">
                  ייצוא מפת שולחנות
                </h3>

                <p className="mt-1 text-sm font-semibold text-[#8A7A68]">
                  בחרי סוג ייצוא ופורמט קובץ
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ExportCard
                title="רק מפת שולחנות"
                description="הכי חד — ייצוא ישיר מהמפה המקורית בלי צילום מסך."
                contentType="map-only"
                isRecommended
              />

              <ExportCard
                title="מפה + רשימת אורחים"
                description="כולל תמונת מפה אמיתית ופירוט אורחים לפי שולחנות."
                contentType="with-guests"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
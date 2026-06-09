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

  const openPrintExport = (contentType: ExportContentType) => {
    if (!eventId) return;

    const params = new URLSearchParams();

    params.set("eventId", eventId);
    params.set("includeGuests", contentType === "with-guests" ? "1" : "0");
    params.set("format", "pdf");
    params.set("mode", "print");

    window.open(`/dashboard/seating/print?${params.toString()}`, "_blank");
  };

  const handleExport = async (contentType: ExportContentType) => {
    if (!eventId || isWorking) return;

    try {
      setIsWorking(true);

      saveRealMapImage();
      openPrintExport(contentType);
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert("הייצוא נכשל. נסי שוב.");
    } finally {
      setIsWorking(false);
    }
  };

  const PdfExportButton = ({
    title,
    onClick,
  }: {
    title: string;
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
          <span className="text-base font-black text-[#2F241C]">{title}</span>
          <span className="mt-1 text-xs font-bold text-[#8A7A68]">
            ייצוא לקובץ PDF
          </span>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6F1EA] text-xl">
          📄
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

        <PdfExportButton
          title="ייצוא PDF"
          onClick={() => void handleExport(contentType)}
        />
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
        📤 ייצוא PDF
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
                  בחרי איזה PDF לייצא
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
                description="ייצוא PDF של מפת השולחנות בלבד."
                contentType="map-only"
                isRecommended
              />

              <ExportCard
                title="מפה + רשימת אורחים"
                description="ייצוא PDF עם תמונת מפה אמיתית ופירוט אורחים לפי שולחנות."
                contentType="with-guests"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
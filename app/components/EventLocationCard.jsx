"use client";

import EventNavigationButtons from "@/app/components/EventNavigationButtons";

export default function EventLocationCard({ location }) {
  if (!location) return null;

  const hasAddress = !!location.address?.trim();
  const hasCoords =
    typeof location.lat === "number" &&
    typeof location.lng === "number";

  // אם אין כלום – לא מציגים
  if (!hasAddress && !hasCoords) return null;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow p-5 mt-8">
      {/* כותרת + כתובת */}
      {hasAddress && (
        <div className="text-center mb-4">
          <div className="text-sm text-[#6b5b3e] leading-relaxed">
            {location.address}
          </div>
          <div className="text-[#6b5b3e] text-sm mt-1">📍 מיקום האירוע</div>
        </div>
      )}

      {/* 🗺️ מפה – רק אם יש קואורדינטות */}
      {hasCoords && (
        <div className="w-full h-[250px] rounded-2xl overflow-hidden border border-[#e6dccb] shadow-sm mb-5">
          <iframe
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`}
          />
        </div>
      )}

      {/* כפתורי ניווט */}
      {hasCoords && (
        <div className="flex justify-center gap-3">
          <EventNavigationButtons location={location} />
        </div>
      )}
    </div>
  );
}
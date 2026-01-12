"use client";

import EventNavigationButtons from "@/app/components/EventNavigationButtons";

export default function EventLocationCard({ location }) {
  console.log("📍 EventLocationCard render");
  console.log("📦 location prop:", location);

  if (!location) {
    console.warn("⚠️ EventLocationCard: location is null/undefined");
    return null;
  }

  if (!location.lat || !location.lng) {
    console.warn("⚠️ EventLocationCard: missing lat/lng", {
      lat: location.lat,
      lng: location.lng,
    });
    return null;
  }

  const { lat, lng, address } = location;

  console.log("🗺️ Rendering map with coords:", { lat, lng });

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow p-5 mt-8">
      {/* כותרת + כתובת */}
      <div className="text-center mb-4">
        {address ? (
          <div className="text-sm text-[#6b5b3e] leading-relaxed">
            {address}
          </div>
        ) : (
          console.warn("⚠️ EventLocationCard: address is empty")
        )}

        <div className="text-[#6b5b3e] text-sm mt-1">📍 מיקום האירוע</div>
      </div>

      {/* 🗺️ מפה */}
      <div className="w-full h-[250px] rounded-2xl overflow-hidden border border-[#e6dccb] shadow-sm mb-5">
        <iframe
          width="100%"
          height="100%"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
          onLoad={() =>
            console.log("✅ Google Maps iframe loaded successfully")
          }
        />
      </div>

      {/* כפתורי ניווט */}
      <div className="flex justify-center gap-3">
        <EventNavigationButtons location={location} />
      </div>
    </div>
  );
}

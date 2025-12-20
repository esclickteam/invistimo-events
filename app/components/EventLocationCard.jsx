"use client";

import EventMap from "@/app/components/EventMap";
import EventNavigationButtons from "@/app/components/EventNavigationButtons";

export default function EventLocationCard({ location }) {
  if (!location) return null;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow p-5 mt-8">
      {/* כותרת + כתובת */}
      <div className="text-center mb-3">
        {location.address && (
          <div className="text-sm text-[#6b5b3e] leading-relaxed">
            {location.address}
          </div>
        )}
        <div className="text-[#6b5b3e] text-sm mt-1">📍 מיקום האירוע</div>
      </div>

      {/* מפה */}
      <div className="rounded-2xl overflow-hidden border border-[#e6dccb] shadow-sm mb-5">
        <EventMap location={location} />
      </div>

      {/* כפתורי ניווט */}
      <div className="flex justify-center gap-3">
        <EventNavigationButtons location={location} />
      </div>
    </div>
  );
}

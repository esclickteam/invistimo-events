"use client";

import EventMap from "@/app/components/EventMap";
import EventNavigationButtons from "@/app/components/EventNavigationButtons";

export default function EventLocationCard({ location }) {
  if (!location) return null;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow p-4 mb-8">
      {/* כותרת + כתובת */}
      <div className="text-center mb-3">
        {location.name && (
          <div className="text-base font-semibold text-[#3f3a34]">
            {location.name}
          </div>
        )}

        {location.address && (
          <div className="text-sm text-[#6b5b3e]">
            {location.address}
          </div>
        )}
      </div>

      {/* מפה */}
      <EventMap location={location} />

      {/* כפתורי ניווט */}
      <div className="mt-4">
        <EventNavigationButtons location={location} />
      </div>
    </div>
  );
}

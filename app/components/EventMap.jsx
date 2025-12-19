"use client";

export default function EventMap({ location }) {
  if (!location) return null;

  const mapSrc =
    location.lat && location.lng
      ? `https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`
      : location.address
      ? `https://www.google.com/maps?q=${encodeURIComponent(
          location.address
        )}&z=15&output=embed`
      : null;

  if (!mapSrc) return null;

  return (
    <div className="w-full mt-6">
      {/* כותרת */}
      <div className="mb-3 text-center text-sm font-medium text-[#6b5b3e]">
        📍 מיקום האירוע
      </div>

      {/* מפה */}
      <div className="w-full rounded-2xl overflow-hidden border border-[#e6dccb] shadow-sm">
        <iframe
          src={mapSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-[220px]"
        />
      </div>
    </div>
  );
}

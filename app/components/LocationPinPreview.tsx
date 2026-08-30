"use client";

import { getGoogleMapsEmbedUrl } from "@/lib/navigationLinks";

type Props = {
  lat?: number | null;
  lng?: number | null;
  label?: string;
};

export default function LocationPinPreview({ lat, lng, label }: Props) {
  const src = getGoogleMapsEmbedUrl({ lat, lng }, 17);
  if (!src || lat == null || lng == null) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#E3D6C3] bg-white shadow-sm">
      <div className="relative h-48 w-full">
        <iframe
          title={label || "מיקום על המפה"}
          src={src}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

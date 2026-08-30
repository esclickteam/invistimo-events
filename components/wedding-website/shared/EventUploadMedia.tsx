"use client";

import type { GuestUploadItem } from "@/types/weddingWebsite";
import WeddingMedia from "@/components/wedding-website/editable/WeddingMedia";

export default function EventUploadMedia({
  item,
  className,
}: {
  item: GuestUploadItem;
  className?: string;
}) {
  return (
    <WeddingMedia
      slot={`event-upload.${item.id}`}
      src={item.url}
      alt={item.name || item.uploadedBy || ""}
      editable={false}
      className={className}
    />
  );
}

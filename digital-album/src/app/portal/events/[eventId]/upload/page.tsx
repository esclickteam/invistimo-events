"use client";

import Link from "next/link";
import { use } from "react";
import { Uploader } from "@/components/Uploader";

export default function PortalUploadPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  return (
    <div className="max-w-xl">
      <Link href={`/portal/events/${eventId}`} className="text-sm text-[var(--muted)]">
        ← חזרה לניהול האירוע
      </Link>
      <h1 className="font-display text-4xl mt-4 mb-6">העלאה כבעלי השמחה</h1>
      <Uploader eventId={eventId} />
    </div>
  );
}

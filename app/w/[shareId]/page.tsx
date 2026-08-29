"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import WeddingGuestMessageForm from "@/components/wedding-website/WeddingGuestMessageForm";
import { useGuestRsvpController } from "@/lib/rsvp/useGuestRsvpController";
import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";

type PublicSiteResponse = {
  success?: boolean;
  title?: string;
  template?: WeddingTemplate | null;
  weddingWebsite?: {
    templateId: string;
    published: boolean;
    content: WeddingDemoContent;
  };
  features?: {
    weddingWebsite?: boolean;
    guestMessages?: boolean;
  };
  guest?: {
    authenticated: true;
    canMessage: boolean;
  } | null;
};

export default function PublicWeddingWebsitePage() {
  const params = useParams<{ shareId: string }>();
  const searchParams = useSearchParams();
  const shareId = params?.shareId || "";
  const token = searchParams.get("token") || "";

  const [data, setData] = useState<PublicSiteResponse | null>(null);
  const [error, setError] = useState("");

  const rsvp = useGuestRsvpController({
    shareId,
    token,
    successMode: "inline",
    enabled: Boolean(shareId),
    onError: () => {},
  });

  useEffect(() => {
    if (!shareId) return;

    let cancelled = false;

    async function load() {
      try {
        const query = token ? `?token=${encodeURIComponent(token)}` : "";
        const res = await fetch(`/api/w/${shareId}${query}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok || !json?.success || !json.template) {
          setError("אתר החתונה לא נמצא או שלא נפתח ללקוח הזה.");
          return;
        }

        setData(json);
      } catch {
        if (!cancelled) setError("שגיאה בטעינת אתר החתונה.");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [shareId, token]);

  if (error) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#111] px-6 text-center text-white">
        <div>
          <p className="text-2xl font-black">האתר לא זמין</p>
          <p className="mt-3 text-sm text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data?.template || !data.weddingWebsite) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#111] text-white">
        טוען אתר חתונה...
      </div>
    );
  }

  const content = data.weddingWebsite.content;
  const showGuestMessage = content.sections?.["guest-message"] !== false;
  const showRsvp = content.sections?.rsvp !== false;
  const guestMessagesEnabled = Boolean(
    data.features?.guestMessages && data.guest?.authenticated && data.guest.canMessage && token
  );

  return (
    <div className="overflow-x-hidden">
      <WeddingTemplateSiteRenderer
        template={data.template}
        content={content}
        live
        rsvpController={showRsvp ? rsvp : null}
        guestMessageSlot={
          guestMessagesEnabled && showGuestMessage ? (
            <WeddingGuestMessageForm
              shareId={shareId}
              token={token}
              title={content.guestMessageTitle}
              description={content.guestMessageDescription}
            />
          ) : null
        }
        liveMeta={{
          shareId,
          token,
          role: token ? "guest" : "demo",
        }}
      />
    </div>
  );
}

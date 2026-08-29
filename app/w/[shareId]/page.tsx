"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import WeddingGuestActions from "@/components/wedding-website/WeddingGuestActions";
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
  settings?: {
    allowGuestNote?: boolean;
    menuOptions?: { key: string; label: string }[];
  };
  guest?: {
    authenticated: true;
    rsvp: "yes" | "no" | "pending";
    arrivedCount: number;
    guestsCount: number;
    notes: string;
    canRsvp: boolean;
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

  useEffect(() => {
    if (!data?.template) return;

    const timer = window.setTimeout(() => {
      document.querySelectorAll("#rsvp, #guestbook").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.dataset.live === "1") return;
        node.remove();
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [data]);

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

  return (
    <div className="overflow-x-hidden">
      <WeddingTemplateSiteRenderer
        template={data.template}
        content={content}
        live
      />
      {data.guest?.authenticated ? (
        <WeddingGuestActions
          shareId={shareId}
          token={token}
          guest={data.guest}
          allowGuestNote={data.settings?.allowGuestNote !== false}
          menuOptions={data.settings?.menuOptions || []}
          guestMessagesEnabled={Boolean(data.features?.guestMessages && data.guest.canMessage)}
          guestMessageTitle={content.guestMessageTitle}
          guestMessageDescription={content.guestMessageDescription}
          showGuestMessage={showGuestMessage}
          showRsvp={showRsvp}
        />
      ) : null}
    </div>
  );
}

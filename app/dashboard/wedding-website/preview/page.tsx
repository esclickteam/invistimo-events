"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import { getWeddingTemplate } from "@/config/weddingWebsite/templates";
import type { WeddingDemoContent, WeddingTemplate } from "@/types/weddingWebsite";

/**
 * Draft preview: the saved draft rendered through the public renderer, with no
 * editing layer at all. This is what "פרסום" would publish right now, as
 * opposed to `/w/{shareId}` which always serves the published version.
 */
export default function WeddingWebsiteDraftPreviewPage() {
  const [template, setTemplate] = useState<WeddingTemplate | null>(null);
  const [content, setContent] = useState<WeddingDemoContent | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [publicPath, setPublicPath] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wedding-website?draft=1", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const website = data?.weddingWebsite;
        const resolved = getWeddingTemplate(website?.templateId);
        if (!website || !resolved) {
          setStatus("error");
          return;
        }
        setTemplate(resolved);
        setContent((website.draftContent || website.content) as WeddingDemoContent);
        setPublicPath(data?.invitation?.shareId ? `/w/${data.invitation.shareId}` : "");
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div dir="rtl" className="px-4 py-20 text-center text-sm font-bold text-[#8A7B69]">
        טוען תצוגה מקדימה...
      </div>
    );
  }

  if (status === "error" || !template || !content) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-[#241A14]">לא הצלחנו לטעון את התצוגה המקדימה</h1>
        <Link
          href="/dashboard/wedding-website"
          className="mt-6 inline-flex rounded-2xl bg-[#B8844F] px-5 py-3 text-sm font-black text-white"
        >
          חזרה לעורך
        </Link>
      </div>
    );
  }

  return (
    <>
      <div
        dir="rtl"
        data-ww-chrome="1"
        className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-2 bg-[#16110d] px-4 py-2 text-white"
      >
        <p className="text-xs font-black">
          תצוגה מקדימה של הטיוטה · האורחים עדיין רואים את הגרסה שפורסמה
        </p>
        <div className="flex items-center gap-2">
          {publicPath ? (
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-black"
            >
              האתר החי
            </a>
          ) : null}
          <Link
            href="/dashboard/wedding-website"
            className="rounded-xl bg-[#C9A962] px-3 py-1.5 text-xs font-black text-[#1a1410]"
          >
            חזרה לעורך
          </Link>
        </div>
      </div>
      <WeddingTemplateSiteRenderer template={template} content={content} />
    </>
  );
}

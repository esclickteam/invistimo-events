"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

type Props = {
  invitationId: string;
  /** Path to regular invitation editor (always available) */
  regularEditHref?: string;
};

/**
 * Clear dual-product UI:
 * - Regular invitation is always present (WhatsApp media source for regular package)
 * - Wedding Website edit CTA only when entitled
 */
export default function WeddingWebsitePackagePanel({
  invitationId,
  regularEditHref,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [entitled, setEntitled] = useState(false);
  const [published, setPublished] = useState(false);
  const [publicPath, setPublicPath] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/wedding-website?invitationId=${encodeURIComponent(invitationId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setEntitled(Boolean(data?.entitled));
        if (data?.entitled && data?.website) {
          setPublished(data.website.status === "published");
          setPublicPath(data.website.publicPath || "");
        }
      } catch {
        if (!cancelled) setEntitled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (invitationId) void load();
    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  if (loading) {
    return (
      <div dir="rtl" className="rounded-[28px] border border-[#E7DED1] bg-white/85 px-6 py-8 text-sm font-bold text-[#8A7B69]">
        טוען פרטי חבילה...
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <section className="rounded-[28px] border border-[#E7DED1] bg-white p-6">
        <h2 className="text-lg font-black text-[#241A14]">ההזמנה שלכם</h2>
        <p className="mt-2 text-sm font-semibold text-[#8A7B69]">
          ההזמנה הרגילה נשארת תמיד — תמונה, תצוגה מקדימה, ושליחה לאורחים בחבילה הרגילה.
        </p>
        {regularEditHref ? (
          <Link
            href={regularEditHref}
            className="mt-4 inline-flex rounded-full border border-[#D9B46F] px-5 py-2.5 text-sm font-black text-[#B8844F]"
          >
            עריכת ההזמנה
          </Link>
        ) : null}
      </section>

      {entitled ? (
        <section className="rounded-[28px] border border-[#E7D0B0] bg-[#FFF9F1] p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#B8844F]" />
            <h2 className="text-lg font-black text-[#241A14]">אתר החתונה האישי שלכם</h2>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#8A7B69]">
            תוספת לחבילה — לא מחליף את ההזמנה. אחרי פרסום, שליחת WhatsApp תשתמש בקישור האתר הציבורי
            והאורחים יזדהו בטלפון/שם ל-RSVP.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/dashboard/wedding-website?invitationId=${encodeURIComponent(invitationId)}`}
              className="inline-flex rounded-full bg-[#B8844F] px-5 py-2.5 text-sm font-black text-white"
            >
              עריכת אתר חתונה אישי
            </Link>
            {published && publicPath ? (
              <Link
                href={publicPath}
                target="_blank"
                className="inline-flex rounded-full border border-[#B8844F] px-5 py-2.5 text-sm font-black text-[#B8844F]"
              >
                צפייה באתר
              </Link>
            ) : (
              <span className="inline-flex items-center text-xs font-bold text-[#8A7B69]">
                טרם פורסם — יש לפרסם לפני שליחה לאורחים
              </span>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

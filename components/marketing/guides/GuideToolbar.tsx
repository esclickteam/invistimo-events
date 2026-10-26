"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  title: string;
  path: string;
  readingMinutes: number;
};

export default function GuideToolbar({ title, path, readingMinutes }: Props) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  // Keep SSR and first client paint identical (absolute marketing URL).
  const url = `https://www.invistimo.com${path.startsWith("/") ? path : `/${path}`}`;

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const copyLink = useCallback(async () => {
    try {
      const full = window.location.href;
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  const shareNative = useCallback(async () => {
    try {
      await navigator.share({
        title,
        text: title,
        url: window.location.href,
      });
    } catch {
      /* user cancelled */
    }
  }, [title]);

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="rounded-full border border-[#E6D2AA] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#7A6042]">
        כ־{readingMinutes} דק׳ קריאה
      </span>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full border border-[#E6D2AA] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#5E4735] transition hover:bg-white"
      >
        הדפסה
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-[#E6D2AA] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#5E4735] transition hover:bg-white"
      >
        {copied ? "הקישור הועתק" : "העתקת קישור"}
      </button>
      {canShare ? (
        <button
          type="button"
          onClick={shareNative}
          className="rounded-full border border-[#E6D2AA] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#5E4735] transition hover:bg-white"
        >
          שיתוף
        </button>
      ) : (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[#E6D2AA] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#5E4735] transition hover:bg-white"
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}

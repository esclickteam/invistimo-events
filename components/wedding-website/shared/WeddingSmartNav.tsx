"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import {
  WEDDING_NAV_PRIMARY,
  WEDDING_SECTIONS,
} from "@/config/weddingWebsite/templates";
import type { WeddingSectionId } from "@/types/weddingWebsite";
import { useWeddingContent } from "./WeddingSiteContext";

export type WeddingSmartNavTheme = {
  bg: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  fontDisplay?: string;
  dark?: boolean;
};

type Props = {
  theme: WeddingSmartNavTheme;
  embed?: boolean;
  hideDemoLink?: boolean;
  className?: string;
  /** sticky (in-flow) vs fixed overlay */
  mode?: "sticky" | "fixed";
  primaryIds?: WeddingSectionId[];
  ctaId?: WeddingSectionId;
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function WeddingSmartNav({
  theme,
  embed,
  hideDemoLink,
  className = "",
  mode = "sticky",
  primaryIds = WEDDING_NAV_PRIMARY,
  ctaId = "rsvp",
}: Props) {
  const content = useWeddingContent();
  const [openMore, setOpenMore] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const all = WEDDING_SECTIONS.filter((s) => s.id !== "footer" && s.id !== "hero");
  const primary = all.filter((s) => primaryIds.includes(s.id));
  const more = all.filter((s) => !primaryIds.includes(s.id));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setOpenMore(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = openMobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openMobile]);

  if (embed) return null;

  const shell =
    mode === "fixed"
      ? "fixed inset-x-0 top-0 z-50"
      : "sticky top-0 z-50";

  return (
    <header
      className={`ww-smart-nav ${shell} ${className}`}
      style={{
        backgroundColor: scrolled ? theme.bg : mode === "fixed" ? "transparent" : theme.bg,
        borderBottom: scrolled || mode === "sticky" ? `1px solid ${theme.border}` : "1px solid transparent",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        transition: "background-color .35s ease, border-color .35s ease, box-shadow .35s ease",
        boxShadow: scrolled ? "0 10px 40px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {!hideDemoLink ? (
            <Link
              href="/wedding-website"
              className="shrink-0 text-[11px] font-semibold tracking-wide opacity-70 transition hover:opacity-100"
              style={{ color: theme.muted }}
            >
              תבניות
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => scrollToId("hero")}
            className="truncate text-base font-semibold tracking-wide md:text-lg"
            style={{
              color: theme.text,
              fontFamily: theme.fontDisplay || "inherit",
            }}
          >
            {content.coupleShort || content.coupleNames}
          </button>
        </div>

        {/* Desktop nav — wrap-safe, no horizontal scroll */}
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="ניווט ראשי">
          {primary.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToId(item.id)}
              className="rounded-full px-3 py-2 text-[13px] font-semibold transition hover:opacity-100"
              style={{ color: theme.muted }}
            >
              {item.navLabel}
            </button>
          ))}

          {more.length > 0 ? (
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setOpenMore((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-semibold"
                style={{ color: theme.muted }}
                aria-expanded={openMore}
              >
                עוד
                <ChevronDown
                  className={`h-3.5 w-3.5 transition ${openMore ? "rotate-180" : ""}`}
                />
              </button>
              {openMore ? (
                <div
                  className="absolute left-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border py-2 shadow-xl"
                  style={{
                    backgroundColor: theme.dark ? "#16131C" : "#FFFFFF",
                    borderColor: theme.border,
                  }}
                >
                  {more.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOpenMore(false);
                        scrollToId(item.id);
                      }}
                      className="block w-full px-4 py-2.5 text-right text-sm font-semibold transition hover:opacity-80"
                      style={{ color: theme.text }}
                    >
                      {item.navLabel}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => scrollToId(ctaId)}
            className="mr-1 rounded-full px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:brightness-110"
            style={{ backgroundColor: theme.accent }}
          >
            אישור הגעה
          </button>
        </nav>

        {/* Mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => scrollToId(ctaId)}
            className="rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ backgroundColor: theme.accent }}
          >
            RSVP
          </button>
          <button
            type="button"
            aria-label={openMobile ? "סגור תפריט" : "פתח תפריט"}
            onClick={() => setOpenMobile((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {openMobile ? (
        <div
          className="max-h-[min(70vh,520px)] overflow-y-auto border-t px-4 py-4 lg:hidden"
          style={{
            backgroundColor: theme.dark ? "#0D0B10" : theme.bg,
            borderColor: theme.border,
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            {all.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setOpenMobile(false);
                  scrollToId(item.id);
                }}
                className="rounded-2xl border px-3 py-3 text-sm font-semibold"
                style={{
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.65)",
                }}
              >
                {item.navLabel}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

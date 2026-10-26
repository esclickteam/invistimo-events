"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronDown, Clock3 } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  FOOTER_COLUMNS,
  FOOTER_HOURS,
  FOOTER_LEGAL_LINKS,
  type FooterColumn,
  type FooterLink,
} from "@/lib/marketing/footerNav";

function FooterAnchor({
  link,
  className,
}: {
  link: FooterLink;
  className: string;
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

function HoursBlock({ compact }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "border-t border-[#EFE3CF] px-4 py-3 text-[13px] font-semibold text-[#6B5A49]"
          : "mt-5 rounded-2xl border border-[#E7D8BD] bg-[#FFFDF8]/90 p-4"
      }
    >
      <p
        className={
          compact
            ? "mb-1.5 flex items-center gap-2 font-black text-[#9A6E24]"
            : "flex items-center gap-2 text-[#9A6E24]"
        }
      >
        <Clock3 size={compact ? 15 : 16} aria-hidden />
        <span className={compact ? undefined : "text-[12px] font-black tracking-[0.04em]"}>
          שעות פעילות
        </span>
      </p>
      <ul className={compact ? "space-y-0.5" : "mt-2 space-y-1 text-[13px] font-semibold text-[#6B5A49]"}>
        {FOOTER_HOURS.map((row) => (
          <li key={row.label}>
            {row.label}: {row.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterColumns() {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  const toggle = (column: FooterColumn) => {
    setOpenId((prev) => (prev === column.id ? null : column.id));
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#E4D2AF] bg-[#FFFDF8]/85 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      {FOOTER_COLUMNS.map((column, index) => {
        const isOpen = openId === column.id;
        const panelId = `${baseId}-${column.id}-panel`;
        const buttonId = `${baseId}-${column.id}-button`;

        return (
          <nav
            key={column.id}
            aria-label={column.title}
            className={
              index < FOOTER_COLUMNS.length - 1
                ? "border-b border-[#E7D8BD] md:border-b-0"
                : undefined
            }
          >
            {/* Mobile accordion trigger */}
            <h3 className="m-0 md:hidden">
              <button
                id={buttonId}
                type="button"
                className="
                  flex min-h-[54px] w-full items-center justify-between
                  px-4 py-3.5 text-right
                  text-[15px] font-extrabold text-[#2F261E]
                  transition hover:bg-[#FAF3E7]
                "
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(column)}
              >
                <span>{column.title}</span>
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={`shrink-0 text-[#B8862D] transition duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </h3>

            {/* Desktop column title */}
            <h3 className="mb-4 hidden text-[13px] font-black tracking-[0.06em] text-[#9A6E24] md:block">
              {column.title}
            </h3>

            {/* Single link list — always in DOM; CSS-collapsed on mobile when closed */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`
                border-t border-[#EFE3CF] bg-[#FBF6EE]/70
                md:block md:border-0 md:bg-transparent
                ${isOpen ? "block" : "hidden"}
              `}
            >
              <ul className="space-y-1 px-4 py-3 md:mt-0 md:space-y-2.5 md:px-0 md:py-0">
                {column.links.map((link) => (
                  <li key={`${column.id}-${link.href}`}>
                    <FooterAnchor
                      link={link}
                      className="
                        block rounded-xl px-2 py-2.5
                        text-[14px] font-bold text-[#4A3A2A]
                        transition hover:bg-white hover:text-[#B8862D]
                        md:rounded-none md:px-0 md:py-0 md:hover:bg-transparent
                      "
                    />
                  </li>
                ))}
              </ul>
              {column.id === "help" ? (
                <>
                  <div className="md:hidden">
                    <HoursBlock compact />
                  </div>
                  <div className="hidden md:block">
                    <HoursBlock />
                  </div>
                </>
              ) : null}
            </div>
          </nav>
        );
      })}
    </div>
  );
}

export default function Footer() {
  const pathname = usePathname();

  const isStaffPage =
    pathname === "/staff" || pathname.startsWith("/staff/");

  // Hide only on live demo / published wedding sites — not the marketing hub.
  const isWeddingWebsite =
    pathname === "/w" ||
    pathname.startsWith("/w/") ||
    pathname.startsWith("/wedding-website/");

  if (isStaffPage || isWeddingWebsite) {
    return null;
  }

  const year = new Date().getFullYear();

  return (
    <footer
      dir="rtl"
      className="
        relative
        border-t border-[#E4D2AF]
        bg-[#F7F1E8]
        text-[#4A3A2A]
        print:hidden
      "
    >
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(circle_at_12%_0%,rgba(201,164,92,0.12),transparent_32%)]
        "
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-28 pt-10 md:px-8 md:pb-14 md:pt-16">
        <div className="mb-12 hidden max-w-2xl md:block">
          <Link
            href="/"
            aria-label="Invistimo — חזרה לדף הבית"
            className="inline-flex transition hover:opacity-90"
            dir="ltr"
          >
            <img
              src="/invistimo-logo.png"
              alt="Invistimo"
              width={168}
              height={56}
              decoding="async"
              className="h-12 w-auto select-none"
              draggable={false}
            />
          </Link>
          <p className="mt-5 text-[28px] font-black leading-snug tracking-[-0.02em] text-[#2F261E]">
            ניהול אירוע חכם, מסודר ואלגנטי.
          </p>
          <p className="mt-3 max-w-xl text-[15px] font-semibold leading-7 text-[#6B5A49]">
            הזמנות דיגיטליות, אישורי הגעה, סידורי הושבה וניהול אירוע — במקום אחד,
            בעיצוב שמרגיש פרימיום.
          </p>
        </div>

        <FooterColumns />

        <div className="mt-8 border-t border-[#E4D2AF] pt-7 md:mt-12 md:pt-8">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="inline-flex w-fit transition hover:opacity-90 md:hidden"
                dir="ltr"
                aria-label="Invistimo — חזרה לדף הבית"
              >
                <img
                  src="/invistimo-logo.png"
                  alt="Invistimo"
                  width={120}
                  height={40}
                  decoding="async"
                  className="h-9 w-auto select-none"
                  draggable={false}
                />
              </Link>
              <p className="text-[13px] font-semibold text-[#7A6A58]">
                © {year} Invistimo · כל הזכויות שמורות
              </p>
            </div>

            <nav
              aria-label="קישורים משפטיים"
              className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-bold text-[#6B5A49]"
            >
              {FOOTER_LEGAL_LINKS.map((link) => (
                <FooterAnchor
                  key={link.href}
                  link={link}
                  className="transition hover:text-[#B8862D]"
                />
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}

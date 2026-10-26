"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ChevronDown } from "lucide-react";
import {
  HEADER_PRIMARY,
  isHeaderPathActive,
  type HeaderNavColumn,
  type HeaderNavItem,
  type HeaderNavLink,
} from "@/lib/marketing/headerNav";

type MarketingHeaderNavProps = {
  pathname: string;
  onNavigate?: () => void;
};

function linkClass(active: boolean, compact?: boolean) {
  return [
    "relative block transition",
    compact
      ? "rounded-xl px-3 py-2.5 text-[14px] font-bold"
      : "px-1 py-2 text-[15px] font-semibold",
    active
      ? "text-[#2F261E]"
      : "text-[#5A4A3C] hover:text-[#B88A2D]",
  ].join(" ");
}

function ActiveUnderline({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className="absolute -bottom-1 right-1/2 h-[2px] w-8 translate-x-1/2 rounded-full bg-[#C9A45C]"
    />
  );
}

function MegaPanel({
  item,
  pathname,
  onNavigate,
  id,
}: {
  item: Extract<HeaderNavItem, { kind: "mega" | "dropdown" }>;
  pathname: string;
  onNavigate?: () => void;
  id: string;
}) {
  const isDropdown = item.kind === "dropdown";
  const columnCount = item.columns.length;

  return (
    <div
      id={id}
      role="region"
      aria-label={item.label}
      className={`
        overflow-hidden
        rounded-[22px]
        border border-[#D9BE80]/70
        bg-[#FFFDF8]
        shadow-[0_24px_60px_rgba(91,65,26,0.14)]
        ${
          isDropdown
            ? "w-[min(320px,calc(100vw-2rem))]"
            : "w-[min(980px,calc(100vw-2rem))]"
        }
      `}
    >
      <div
        className={`
          max-h-[min(70vh,640px)] overflow-y-auto
          ${isDropdown ? "p-4" : "p-5 md:p-6"}
        `}
      >
        <div
          className={
            isDropdown
              ? "grid gap-1"
              : columnCount >= 4
                ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
                : columnCount === 3
                  ? "grid gap-6 md:grid-cols-3"
                  : "grid gap-6 md:grid-cols-2"
          }
        >
          {item.columns.map((column) => (
            <NavColumn
              key={column.id}
              column={column}
              pathname={pathname}
              onNavigate={onNavigate}
              compact={isDropdown}
            />
          ))}
        </div>
      </div>

      {item.footerLink ? (
        <div className="border-t border-[#E7D8BD] bg-[#FBF6EE]/90 px-5 py-3.5 md:px-6">
          <Link
            href={item.footerLink.href}
            onClick={onNavigate}
            className="
              inline-flex items-center gap-2
              text-[15px] font-extrabold text-[#8A642E]
              transition hover:text-[#6E4E22]
            "
          >
            {item.footerLink.label}
            <span aria-hidden className="text-lg leading-none">
              ←
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function NavColumn({
  column,
  pathname,
  onNavigate,
  compact,
}: {
  column: HeaderNavColumn;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <div>
      {!compact ? (
        <p className="mb-3 text-[12px] font-black tracking-[0.08em] text-[#9A6E24]">
          {column.title}
        </p>
      ) : null}
      <ul className={compact ? "space-y-0.5" : "space-y-1"}>
        {column.links.map((link) => (
          <li key={`${column.id}-${link.href}`}>
            <ColumnLink
              link={link}
              active={isHeaderPathActive(pathname, link.href)}
              onNavigate={onNavigate}
              compact={compact}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColumnLink({
  link,
  active,
  onNavigate,
  compact,
}: {
  link: HeaderNavLink;
  active: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={`
        block rounded-xl transition
        ${
          active
            ? "bg-[#F7EBD4] text-[#2F261E]"
            : "text-[#4A3A2A] hover:bg-[#FAF3E7] hover:text-[#8A642E]"
        }
        ${compact ? "px-3.5 py-2.5 text-[15px] font-bold" : "px-3 py-2.5"}
      `}
    >
      <span className={`block ${compact ? "" : "text-[14px] font-bold leading-5"}`}>
        {link.label}
      </span>
      {!compact && link.description ? (
        <span className="mt-0.5 block text-[12px] font-medium leading-5 text-[#7A6A5E]">
          {link.description}
        </span>
      ) : null}
    </Link>
  );
}

export function DesktopMarketingNav({
  pathname,
  onNavigate,
}: MarketingHeaderNavProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openMenu = useCallback(
    (id: string) => {
      clearCloseTimer();
      setOpenId(id);
    },
    [clearCloseTimer]
  );

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenId(null), 140);
  }, [clearCloseTimer]);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setOpenId(null);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!openId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [openId, closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  const onTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    id: string
  ) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(id);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  };

  const openItem = HEADER_PRIMARY.find(
    (item): item is Extract<HeaderNavItem, { kind: "mega" | "dropdown" }> =>
      item.kind !== "link" && item.id === openId
  );

  return (
    <div
      ref={rootRef}
      className="relative hidden xl:block"
      onMouseLeave={scheduleClose}
    >
      <nav
        aria-label="ניווט ראשי"
        className="flex items-center justify-center gap-5 whitespace-nowrap 2xl:gap-6"
      >
        {HEADER_PRIMARY.map((item) => {
          if (item.kind === "link") {
            const active = isHeaderPathActive(pathname, item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                className={linkClass(active)}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
                <ActiveUnderline show={active} />
              </Link>
            );
          }

          const panelId = `${baseId}-${item.id}-panel`;
          const isOpen = openId === item.id;
          const sectionActive =
            item.columns.some((column) =>
              column.links.some((link) =>
                isHeaderPathActive(pathname, link.href)
              )
            ) ||
            (item.footerLink
              ? isHeaderPathActive(pathname, item.footerLink.href)
              : false);

          return (
            <button
              key={item.id}
              type="button"
              className={`${linkClass(sectionActive || isOpen)} inline-flex items-center gap-1`}
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-haspopup="true"
              onMouseEnter={() => openMenu(item.id)}
              onClick={() => openMenu(item.id)}
              onKeyDown={(event) => onTriggerKeyDown(event, item.id)}
            >
              {item.label}
              <ChevronDown
                size={15}
                className={`transition ${isOpen ? "rotate-180 text-[#B88A2D]" : ""}`}
                aria-hidden
              />
              <ActiveUnderline show={sectionActive && !isOpen} />
            </button>
          );
        })}
      </nav>

      {openItem ? (
        <div
          className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
          onMouseEnter={() => openMenu(openItem.id)}
        >
          <MegaPanel
            item={openItem}
            pathname={pathname}
            onNavigate={() => {
              closeMenu();
              onNavigate?.();
            }}
            id={`${baseId}-${openItem.id}-panel`}
          />
        </div>
      ) : null}
    </div>
  );
}

export function MobileMarketingNav({
  pathname,
  onNavigate,
}: MarketingHeaderNavProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <nav
      aria-label="ניווט ראשי בנייד"
      className="flex flex-col overflow-hidden rounded-[22px] border border-[#E7D8BD] bg-white/70"
    >
      {HEADER_PRIMARY.map((item) => {
        if (item.kind === "link") {
          const active = isHeaderPathActive(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`
                border-b border-[#E7D8BD] px-5 py-4 text-[16px] font-bold transition last:border-b-0
                ${
                  active
                    ? "bg-[#F7EBD4] text-[#9A6E24]"
                    : "text-[#4A3A2A] hover:bg-[#FAF3E7]"
                }
              `}
            >
              {item.label}
            </Link>
          );
        }

        const isOpen = expandedId === item.id;
        const panelId = `mobile-${item.id}-panel`;

        return (
          <div key={item.id} className="border-b border-[#E7D8BD] last:border-b-0">
            <button
              type="button"
              className="
                flex w-full items-center justify-between
                px-5 py-4 text-[16px] font-bold text-[#4A3A2A]
                transition hover:bg-[#FAF3E7]
              "
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setExpandedId(isOpen ? null : item.id)}
            >
              {item.label}
              <ChevronDown
                size={18}
                className={`text-[#B88A2D] transition ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {isOpen ? (
              <div id={panelId} className="space-y-4 bg-[#FFFDF8] px-4 pb-4">
                {item.columns.map((column) => (
                  <div key={column.id}>
                    <p className="mb-2 px-2 text-[12px] font-black tracking-[0.06em] text-[#9A6E24]">
                      {column.title}
                    </p>
                    <ul className="space-y-1">
                      {column.links.map((link) => {
                        const active = isHeaderPathActive(pathname, link.href);
                        return (
                          <li key={`${column.id}-${link.href}`}>
                            <Link
                              href={link.href}
                              onClick={onNavigate}
                              aria-current={active ? "page" : undefined}
                              className={`
                                block rounded-xl px-3 py-2.5 text-[15px] font-bold
                                ${
                                  active
                                    ? "bg-[#F7EBD4] text-[#9A6E24]"
                                    : "text-[#4A3A2A] hover:bg-[#FAF3E7]"
                                }
                              `}
                            >
                              {link.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                {item.footerLink ? (
                  <Link
                    href={item.footerLink.href}
                    onClick={onNavigate}
                    className="
                      mt-1 block rounded-xl border border-[#E7D8BD]
                      bg-[#FBF6EE] px-3 py-3 text-center
                      text-[15px] font-extrabold text-[#8A642E]
                    "
                  >
                    {item.footerLink.label}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

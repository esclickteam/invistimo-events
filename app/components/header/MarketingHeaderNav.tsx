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
import { Calculator, CalendarDays, ChevronDown, Gem, LayoutGrid, MessageCircle, Users, Briefcase } from "lucide-react";
import {
  HEADER_PRIMARY,
  isHeaderPathActive,
  type HeaderNavColumn,
  type HeaderNavItem,
  type HeaderNavLink,
} from "@/lib/marketing/headerNav";
import { blogMenu, type BlogCategoryId } from "@/lib/blog/taxonomy";
import { placementForSlug } from "@/lib/blog/taxonomy";
import styles from "./guidesMenu.module.css";

const BLOG_MENU = blogMenu();

type MarketingHeaderNavProps = {
  pathname: string;
  onNavigate?: () => void;
};

type GuidesMotion = "closed" | "pre" | "open" | "closing";

const CATEGORY_ICONS = {
  planning: CalendarDays,
  rsvp: MessageCircle,
  seating: LayoutGrid,
  weddings: Gem,
  family: Users,
  business: Briefcase,
  tools: Calculator,
} as const;

function CategoryIcon({ id }: { id: BlogCategoryId }) {
  const Icon = CATEGORY_ICONS[id];
  return <Icon size={18} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-[#8A642E]" />;
}

function linkClass(active: boolean, compact?: boolean) {
  return [
    "relative block text-current transition-opacity duration-150 hover:opacity-80",
    compact
      ? "rounded-none px-3 py-2.5 text-[14px] font-semibold"
      : "px-1 py-2 text-[13px] font-semibold xl:text-[15px]",
    active ? "" : "",
  ].join(" ");
}

function ActiveUnderline({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className="site-header-underline absolute -bottom-1 right-1/2 h-[2px] w-8 translate-x-1/2"
    />
  );
}

function menuIsActive(
  item: Exclude<HeaderNavItem, { kind: "link" }>,
  pathname: string
) {
  if (item.kind === "guides") {
    return (
      pathname === "/blog" ||
      pathname.startsWith("/blog/") ||
      pathname === "/info/guides" ||
      pathname.startsWith("/info/guides/")
    );
  }

  return (
    item.columns.some((column) =>
      column.links.some((link) => isHeaderPathActive(pathname, link.href))
    ) ||
    (item.footerLink ? isHeaderPathActive(pathname, item.footerLink.href) : false)
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
      className={`overflow-hidden rounded-[22px] border border-[#D9BE80]/70 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(91,65,26,0.14)] ${
          isDropdown
            ? "w-[min(320px,calc(100vw-2rem))]"
            : "w-[min(980px,calc(100vw-2rem))]"
        }`}
    >
      <div
        className={`max-h-[min(70vh,640px)] overflow-y-auto ${isDropdown ? "p-4" : "p-5 md:p-6"}`}
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
            className="inline-flex items-center gap-2 text-[15px] font-extrabold text-[#8A642E] transition hover:text-[#6E4E22]"
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
      className={`block rounded-xl transition ${
          active
            ? "bg-[#F7EBD4] text-[#2F261E]"
            : "text-[#4A3A2A] hover:bg-[#FAF3E7] hover:text-[#8A642E]"
        } ${compact ? "px-3.5 py-2.5 text-[15px] font-bold" : "px-3 py-2.5"}`}
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

function GuidesPanel({
  id,
  pathname,
  onNavigate,
  focusToken,
  visible,
}: {
  id: string;
  pathname: string;
  onNavigate?: () => void;
  focusToken: number;
  visible: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<BlogCategoryId>(BLOG_MENU[0]?.id || "planning");

  useEffect(() => {
    if (pathname.startsWith("/blog/")) {
      const id = pathname.split("/")[2] as BlogCategoryId;
      if (BLOG_MENU.some((category) => category.id === id)) {
        setActiveId(id);
        return;
      }
    }
    const slug = pathname.startsWith("/info/guides/")
      ? pathname.slice("/info/guides/".length).split(/[/?#]/)[0]
      : "";
    const match = slug ? placementForSlug(slug) : undefined;
    if (match) setActiveId(match.categoryId);
  }, [pathname]);

  useEffect(() => {
    if (!focusToken || !visible) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-guide-cat]")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusToken, visible]);

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const root = panelRef.current;
    if (!root) return;
    const target = event.target as HTMLElement;
    const categoryEls = [...root.querySelectorAll<HTMLElement>("[data-guide-cat]")];
    const featuredRoot = root.querySelector<HTMLElement>(
      `[data-featured-panel="${activeId}"]`
    );
    const featuredEls = featuredRoot
      ? [...featuredRoot.querySelectorAll<HTMLAnchorElement>("a")]
      : [];

    const focusCategory = (element?: HTMLElement) => {
      if (!element) return;
      element.focus();
      const nextId = element.dataset.catId as BlogCategoryId | undefined;
      if (nextId) setActiveId(nextId);
    };

    if (target.hasAttribute("data-guide-cat")) {
      const index = categoryEls.indexOf(target);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        focusCategory(categoryEls[(index + delta + categoryEls.length) % categoryEls.length]);
      }
      if (event.key === "Home") {
        event.preventDefault();
        focusCategory(categoryEls[0]);
      }
      if (event.key === "End") {
        event.preventDefault();
        focusCategory(categoryEls[categoryEls.length - 1]);
      }
      if (event.key === "ArrowLeft" && featuredEls[0]) {
        event.preventDefault();
        featuredEls[0].focus();
      }
    }

    if (target.hasAttribute("data-guide-link") && featuredEls.length) {
      const index = featuredEls.indexOf(target as HTMLAnchorElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        featuredEls[(index + delta + featuredEls.length) % featuredEls.length]?.focus();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        categoryEls.find((element) => element.dataset.catId === activeId)?.focus();
      }
    }
  };

  return (
    <div
      ref={panelRef}
      id={id}
      role="region"
      aria-label="בלוג"
      onKeyDown={onPanelKeyDown}
      className="w-[min(76rem,calc(100vw-1.5rem))] border border-[#D9BE80] bg-[#FFFDF8] text-[#3F3025] shadow-[0_18px_40px_rgba(66,24,47,0.12)]"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {BLOG_MENU.map((category) => {
          const selected = category.id === activeId;
          return (
            <section
              key={category.id}
              data-featured-panel={category.id}
              className={`border-b border-l border-[#E7D8BD] px-3 py-3 ${selected ? "bg-[#FBF6EE]" : "bg-[#FFFDF8]"}`}
            >
              <Link
                href={category.href}
                data-guide-cat=""
                data-cat-id={category.id}
                aria-current={selected ? "true" : undefined}
                onMouseEnter={() => setActiveId(category.id)}
                onFocus={() => setActiveId(category.id)}
                onClick={onNavigate}
                className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A642E]"
              >
                <CategoryIcon id={category.id} />
                <span className="text-[14px] font-black leading-5 text-[#35281F]">{category.title}</span>
              </Link>
              <ul className={`mt-2 grid gap-x-3 ${category.links.length > 4 ? "grid-cols-2" : "grid-cols-1"}`}>
                {category.links.map((link) => {
                  const active = isHeaderPathActive(pathname, link.href.split("#")[0]);
                  return (
                    <li key={`${category.id}-${link.href}`}>
                      <Link
                        href={link.href}
                        data-guide-link=""
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        className={`block py-1 text-[13px] font-semibold leading-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A642E] ${
                          active ? "text-[#842B4C]" : "text-[#5C4A3A] hover:text-[#8A642E]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="border-t border-[#E7D8BD] bg-[#FBF6EE] px-4 py-2">
        <Link
          href="/blog"
          onClick={onNavigate}
          className="inline-flex min-h-10 items-center text-[14px] font-extrabold text-[#42182F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A642E]"
        >
          לכל המאמרים
          <span aria-hidden className="px-1">
            ←
          </span>
        </Link>
      </div>
    </div>
  );
}

export function DesktopMarketingNav({
  pathname,
  onNavigate,
}: MarketingHeaderNavProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [guidesMotion, setGuidesMotion] = useState<GuidesMotion>("closed");
  const [guidesFocusToken, setGuidesFocusToken] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
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
    if (openId === "guides") {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        setGuidesMotion("open");
        return;
      }
      setGuidesMotion("pre");
      const frame = requestAnimationFrame(() => setGuidesMotion("open"));
      return () => cancelAnimationFrame(frame);
    }

    setGuidesMotion((current) => {
      if (current === "closed" || current === "pre") return "closed";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      return reduced ? "closed" : "closing";
    });
  }, [openId]);

  useEffect(() => {
    if (guidesMotion !== "closing") return;
    const timer = window.setTimeout(() => setGuidesMotion("closed"), 160);
    return () => window.clearTimeout(timer);
  }, [guidesMotion]);

  useEffect(() => {
    if (!openId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        const id = openId;
        closeMenu();
        if (id) triggerRefs.current[id]?.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openId, closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  const onTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    item: Exclude<HeaderNavItem, { kind: "link" }>
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (item.kind === "guides" && openId === item.id) {
        closeMenu();
        return;
      }
      if (item.kind === "guides") setGuidesFocusToken((token) => token + 1);
      openMenu(item.id);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (item.kind === "guides") setGuidesFocusToken((token) => token + 1);
      openMenu(item.id);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  };

  const megaItems = HEADER_PRIMARY.filter(
    (item): item is Extract<HeaderNavItem, { kind: "mega" | "dropdown" }> =>
      item.kind === "mega" || item.kind === "dropdown"
  );
  const guidesItem = HEADER_PRIMARY.find(
    (item): item is Extract<HeaderNavItem, { kind: "guides" }> => item.kind === "guides"
  );
  const guidesPanelId = `${baseId}-guides-panel`;

  return (
    <div
      ref={rootRef}
      className="relative hidden lg:block"
      onMouseLeave={scheduleClose}
    >
      <nav
        aria-label="ניווט ראשי"
        className="flex items-center justify-center gap-3 whitespace-nowrap xl:gap-5 2xl:gap-6"
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

          const panelId = item.kind === "guides" ? guidesPanelId : `${baseId}-${item.id}-panel`;
          const isOpen = openId === item.id;
          const sectionActive = menuIsActive(item, pathname);

          return (
            <button
              key={item.id}
              ref={(node) => {
                triggerRefs.current[item.id] = node;
              }}
              type="button"
              className={`${linkClass(sectionActive || isOpen)} inline-flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8A642E]`}
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-haspopup="true"
              onMouseEnter={() => openMenu(item.id)}
              onClick={() => {
                if (item.kind === "guides" && openId === item.id) closeMenu();
                else openMenu(item.id);
              }}
              onKeyDown={(event) => onTriggerKeyDown(event, item)}
            >
              {item.label}
              <ChevronDown
                size={15}
                className={`text-current transition ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
              <ActiveUnderline show={sectionActive && !isOpen} />
            </button>
          );
        })}
      </nav>

      {/*
        Keep every mega/dropdown href in the initial HTML for crawlers.
        Visibility still follows openId — closed panels are hidden, not unmounted.
      */}
      {megaItems.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={
              isOpen
                ? "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
                : "hidden"
            }
            hidden={!isOpen}
            onMouseEnter={() => openMenu(item.id)}
          >
            <MegaPanel
              item={item}
              pathname={pathname}
              onNavigate={() => {
                closeMenu();
                onNavigate?.();
              }}
              id={`${baseId}-${item.id}-panel`}
            />
          </div>
        );
      })}

      {guidesItem ? (
        <div
          className={
            guidesMotion === "closed"
              ? "hidden"
              : `absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 ${
                  guidesMotion === "closing" ? "pointer-events-none" : ""
                }`
          }
          hidden={guidesMotion === "closed"}
          onMouseEnter={() => openMenu("guides")}
        >
          <div
            className={styles.motion}
            data-motion={guidesMotion === "closed" ? "open" : guidesMotion}
          >
            <GuidesPanel
              id={guidesPanelId}
              pathname={pathname}
              focusToken={guidesFocusToken}
              visible={guidesMotion !== "closed"}
              onNavigate={() => {
                closeMenu();
                onNavigate?.();
              }}
            />
          </div>
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
  const [guideCategoryId, setGuideCategoryId] = useState<BlogCategoryId | null>(null);

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
              className={`border-b border-[#E7D8BD] px-5 py-4 text-[16px] font-bold transition last:border-b-0 ${
                  active
                    ? "bg-[#F7EBD4] text-[#9A6E24]"
                    : "text-[#4A3A2A] hover:bg-[#FAF3E7]"
                }`}
            >
              {item.label}
            </Link>
          );
        }

        if (item.kind === "guides") {
          const isOpen = expandedId === item.id;
          const panelId = "mobile-guides-panel";
          return (
            <div key={item.id} className="border-b border-[#E7D8BD] last:border-b-0">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-between px-5 py-4 text-right text-[16px] font-bold text-[#4A3A2A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8A642E]"
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

              <div id={panelId} hidden={!isOpen} className={isOpen ? "bg-[#FFFDF8]" : "hidden"}>
                <ul>
                  {item.categories.map((category) => {
                    const categoryOpen = guideCategoryId === category.id;
                    const foldId = `mobile-guides-${category.id}`;
                    return (
                      <li key={category.id} className="border-t border-[#E7D8BD]">
                        <button
                          type="button"
                          className="flex min-h-12 w-full items-start gap-3 px-4 py-3 text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8A642E]"
                          aria-expanded={categoryOpen}
                          aria-controls={foldId}
                          onClick={() =>
                            setGuideCategoryId(categoryOpen ? null : category.id)
                          }
                        >
                          <CategoryIcon id={category.id} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold leading-6 text-[#35281F]">
                              {category.title}
                            </span>
                            <span className="mt-0.5 block text-[13px] font-medium leading-5 text-[#7A6042]">
                              {category.description}
                            </span>
                          </span>
                          <ChevronDown
                            size={16}
                            aria-hidden
                            className={`mt-1 shrink-0 text-[#C5A582] transition ${categoryOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        <div
                          id={foldId}
                          className={styles.fold}
                          data-open={categoryOpen ? "true" : "false"}
                        >
                          <div className={styles.foldInner} inert={!categoryOpen}>
                            <ul className="px-4 pb-2">
                              {category.links.map((link) => (
                                <li key={`${category.id}-${link.href}`}>
                                  <Link
                                    href={link.href}
                                    onClick={onNavigate}
                                    className="block min-h-11 py-2 pr-8 text-[15px] font-semibold text-[#35281F]"
                                  >
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            <Link
                              href={category.href}
                              onClick={onNavigate}
                              className="mx-4 mb-3 inline-flex min-h-11 items-center border border-[#C5A582] bg-[#FFF8F0] px-4 text-[14px] font-bold text-[#42182F]"
                            >
                              לכל המאמרים בקטגוריה
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-[#E7D8BD] px-4 py-3">
                  <Link
                    href={item.footerLink.href}
                    onClick={onNavigate}
                    className="inline-flex min-h-11 w-full items-center justify-center border border-[#42182F] bg-[#42182F] px-4 text-[15px] font-extrabold text-[#FFF8F0]"
                  >
                    {item.footerLink.label}
                  </Link>
                </div>
              </div>
            </div>
          );
        }

        const isOpen = expandedId === item.id;
        const panelId = `mobile-${item.id}-panel`;

        return (
          <div key={item.id} className="border-b border-[#E7D8BD] last:border-b-0">
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-[16px] font-bold text-[#4A3A2A] transition hover:bg-[#FAF3E7]"
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

            <div
              id={panelId}
              hidden={!isOpen}
              className={
                isOpen ? "space-y-4 bg-[#FFFDF8] px-4 pb-4" : "hidden"
              }
            >
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
                            className={`block rounded-xl px-3 py-2.5 text-[15px] font-bold ${
                                active
                                  ? "bg-[#F7EBD4] text-[#9A6E24]"
                                  : "text-[#4A3A2A] hover:bg-[#FAF3E7]"
                              }`}
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
                  className="mt-1 block rounded-xl border border-[#E7D8BD] bg-[#FBF6EE] px-3 py-3 text-center text-[15px] font-extrabold text-[#8A642E]"
                >
                  {item.footerLink.label}
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

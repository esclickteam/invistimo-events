"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import { useWeddingTheme } from "./WeddingThemeProvider";

export default function WeddingNav() {
  const { content } = useWeddingTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("hero");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 60);

      const sections = WEDDING_SECTIONS.map((s) => s.id);
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActive(id);
          break;
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const navItems = WEDDING_SECTIONS.filter(
    (s) => !["hero", "footer"].includes(s.id)
  );

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "border-b border-[var(--ww-border)] bg-[var(--ww-bg)]/88 backdrop-blur-xl shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button
            type="button"
            onClick={() => scrollTo("hero")}
            className="ww-display text-lg font-semibold md:text-xl"
            style={{ fontFamily: "var(--ww-font-display)" }}
          >
            {content.coupleShort}
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.slice(0, 10).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                  active === item.id
                    ? "bg-[var(--ww-accent-soft)] text-[var(--ww-accent)]"
                    : "text-[var(--ww-text-muted)] hover:text-[var(--ww-text)]"
                }`}
              >
                {item.navLabel}
              </button>
            ))}
            <button
              type="button"
              onClick={() => scrollTo("rsvp")}
              className="mr-2 rounded-full bg-[var(--ww-accent)] px-5 py-2.5 text-xs font-black text-white shadow-lg transition hover:scale-105"
            >
              אישור הגעה
            </button>
          </nav>

          <button
            type="button"
            className="rounded-xl border border-[var(--ww-border)] p-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="תפריט"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute inset-y-0 left-0 w-[min(320px,88vw)] border-l border-[var(--ww-border)] bg-[var(--ww-bg)] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-black">{content.coupleNames}</span>
                <button type="button" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className="rounded-xl px-4 py-3 text-right text-sm font-bold text-[var(--ww-text)] hover:bg-[var(--ww-accent-soft)]"
                  >
                    {item.navLabel}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

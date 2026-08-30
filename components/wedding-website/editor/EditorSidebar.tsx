"use client";

import type { ReactNode } from "react";

import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import { editorSectionLabel, resolveSectionOrder } from "@/lib/weddingWebsite/editorSections";
import type { EditorWarning } from "@/lib/weddingWebsite/editorWarnings";
import EditorSectionList from "./EditorSectionList";
import EditorSectionSettings from "./EditorSectionSettings";
import EditorThemePanel from "./EditorThemePanel";
import { EditorButton, EditorPanelSection } from "./EditorUI";

export type SidebarTab = "sections" | "theme" | "settings";

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </svg>
  );
}

function IconPalette() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3a9 9 0 0 0 0 18h1.2a2.4 2.4 0 0 0 2.1-3.6 2.4 2.4 0 0 1 2.1-3.6H18a3 3 0 0 0 0-6 9 9 0 0 0-6-4.8Z" />
      <circle cx="8" cy="10" r="1" fill="currentColor" />
      <circle cx="11" cy="7.5" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.1M12 18.9V21M4.9 6.3l1.5 1.5M17.6 16.2l1.5 1.5M3 12h2.1M18.9 12H21M4.9 17.7l1.5-1.5M17.6 7.8l1.5-1.5" />
    </svg>
  );
}

const RAIL: Array<{
  id: SidebarTab;
  label: string;
  openLabel: string;
  icon: () => ReactNode;
}> = [
  { id: "sections", label: "פתיחת פאנל המקטעים", openLabel: "סגירת פאנל המקטעים", icon: IconLayers },
  { id: "theme", label: "עיצוב האתר", openLabel: "סגירת פאנל העיצוב", icon: IconPalette },
  { id: "settings", label: "הגדרות האתר", openLabel: "סגירת פאנל ההגדרות", icon: IconGear },
];

export default function EditorSidebar({
  tab,
  onTab,
  open,
  onToggle,
  warnings,
  templateName,
  publicPath,
  onChangeTemplate,
  onOpenMediaLibrary,
  activeSectionId,
  onSelectSection,
}: {
  tab: SidebarTab;
  onTab: (tab: SidebarTab) => void;
  open: boolean;
  onToggle: () => void;
  warnings: EditorWarning[];
  templateName: string;
  publicPath: string;
  onChangeTemplate: () => void;
  onOpenMediaLibrary: () => void;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
}) {
  const site = useWeddingSite();
  const sectionCount = resolveSectionOrder(site?.content).length;

  function activate(id: SidebarTab) {
    if (open && tab === id) {
      onToggle();
      return;
    }
    onTab(id);
    if (!open) onToggle();
  }

  return (
    <div
      dir="ltr"
      data-ww-chrome="1"
      data-ww-editor-dock="1"
      className="relative z-40 flex h-full shrink-0 flex-row"
    >
      {open ? (
        <aside
          dir="rtl"
          className="flex h-full w-[300px] shrink-0 flex-col border-l border-white/10 bg-[#16110d] text-white"
          aria-label="מבנה האתר והגדרות"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-[10px] font-black tracking-wide text-white/35">עורך האתר</p>
            <h2 className="mt-0.5 text-lg font-black text-white">
              {tab === "sections" ? "מבנה האתר" : tab === "theme" ? "עיצוב" : "הגדרות"}
            </h2>
            {tab === "sections" ? (
              <p className="mt-1 text-[11px] font-semibold leading-4 text-white/45">
                {sectionCount} מקטעים — גררו לשינוי סדר, לחצו כדי לערוך
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "sections" ? (
              <>
                <EditorPanelSection title="מקטעים">
                  <EditorSectionList warnings={warnings} onOpenSettings={onSelectSection} />
                </EditorPanelSection>
                {activeSectionId ? <EditorSectionSettings sectionId={activeSectionId} /> : null}
              </>
            ) : null}

            {tab === "theme" ? (
              <EditorThemePanel templateName={templateName} onChangeTemplate={onChangeTemplate} />
            ) : null}

            {tab === "settings" ? (
              <>
                <EditorPanelSection title="מדיה">
                  <EditorButton
                    tone="outline"
                    label="ספריית המדיה"
                    className="w-full"
                    onClick={onOpenMediaLibrary}
                  />
                </EditorPanelSection>
                <EditorPanelSection title="מידע מהמערכת">
                  <p className="text-[11px] font-semibold leading-5 text-white/60">
                    אישור הגעה, הסעות והודעות מהאורחים מחוברים למערכת האמיתית. בעורך משנים רק כותרות
                    ועיצוב.
                  </p>
                  <a
                    href="/dashboard/edit-invitation"
                    className="block min-h-[38px] rounded-xl border border-white/15 px-3 pt-2.5 text-center text-[11px] font-black text-white hover:bg-white/10"
                  >
                    עריכת פרטי האירוע
                  </a>
                  <a
                    href="/dashboard/guest-messages"
                    className="block min-h-[38px] rounded-xl border border-white/15 px-3 pt-2.5 text-center text-[11px] font-black text-white hover:bg-white/10"
                  >
                    הודעות מהאורחים
                  </a>
                  {publicPath ? (
                    <a
                      href={publicPath}
                      target="_blank"
                      rel="noreferrer"
                      className="block min-h-[38px] rounded-xl border border-white/15 px-3 pt-2.5 text-center text-[11px] font-black text-white hover:bg-white/10"
                    >
                      צפייה באתר החי
                    </a>
                  ) : null}
                </EditorPanelSection>
                <EditorPanelSection title="מתנות">
                  <p className="text-[11px] font-semibold leading-5 text-white/60">
                    Bit, אשראי ו-PayBox מופיעים לפי הקישורים ומספר הטלפון ששמרתם בפרטי האירוע.
                  </p>
                </EditorPanelSection>
                <WarningsPanel warnings={warnings} />
              </>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-3 py-3">
            <p className="text-[10px] font-bold leading-4 text-white/40">
              {site?.content.coupleNames || "אתר החתונה"}
            </p>
          </div>
        </aside>
      ) : null}

      <nav
        dir="rtl"
        data-ww-editor-rail="1"
        className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-l border-white/10 bg-[#1b1612] py-3"
        aria-label="כלי העורך"
      >
        {RAIL.map((item) => {
          const Icon = item.icon;
          const active = open && tab === item.id;
          return (
            <span key={item.id} className="relative">
              <EditorButton
                iconOnly
                tone={active ? "solid" : "ghost"}
                aria-pressed={active}
                label={active ? item.openLabel : item.label}
                icon={<Icon />}
                onClick={() => activate(item.id)}
                className="h-10 w-10"
              />
              {item.id === "sections" && warnings.length ? (
                <span
                  title={`${warnings.length} התראות עיצוב`}
                  className="absolute -left-0.5 -top-0.5 min-w-[16px] rounded-full bg-[#C9A962] px-1 text-center text-[9px] font-black text-[#1a1410]"
                >
                  {warnings.length}
                </span>
              ) : null}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

function WarningsPanel({ warnings }: { warnings: EditorWarning[] }) {
  const site = useWeddingSite();
  if (!warnings.length) return null;

  return (
    <EditorPanelSection title={`התראות עיצוב (${warnings.length})`}>
      <ul className="space-y-1.5">
        {warnings.map((warning) => (
          <li key={warning.id}>
            <button
              type="button"
              onClick={() => {
                if (warning.sectionId) site?.editor?.scrollToSection(warning.sectionId);
              }}
              className={`w-full rounded-xl p-2.5 text-right text-[11px] font-semibold leading-5 transition ${
                warning.level === "warning"
                  ? "bg-[#E8A87C]/12 text-[#F0C9A8] hover:bg-[#E8A87C]/20"
                  : "bg-white/[0.06] text-white/60 hover:bg-white/10"
              }`}
            >
              {warning.sectionId ? (
                <span className="mb-0.5 block text-[10px] font-black text-white/40">
                  {editorSectionLabel(warning.sectionId)}
                </span>
              ) : null}
              {warning.message}
            </button>
          </li>
        ))}
      </ul>
    </EditorPanelSection>
  );
}

export function moveGalleryImage(
  images: string[] | undefined,
  index: number,
  direction: -1 | 1
) {
  const current = [...(images || [])];
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= current.length) return current;
  const [item] = current.splice(index, 1);
  current.splice(nextIndex, 0, item);
  return current;
}

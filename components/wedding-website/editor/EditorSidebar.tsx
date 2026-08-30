"use client";

import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import { editorSectionLabel } from "@/lib/weddingWebsite/editorSections";
import type { EditorWarning } from "@/lib/weddingWebsite/editorWarnings";
import EditorSectionList from "./EditorSectionList";
import EditorSectionSettings from "./EditorSectionSettings";
import EditorThemePanel from "./EditorThemePanel";
import { EditorButton, EditorPanelSection } from "./EditorUI";

export type SidebarTab = "sections" | "theme" | "settings";

const TABS: Array<[SidebarTab, string]> = [
  ["sections", "מקטעים"],
  ["theme", "עיצוב"],
  ["settings", "הגדרות"],
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

  if (!open) {
    return (
      <aside
        dir="rtl"
        data-ww-chrome="1"
        className="flex h-full w-12 shrink-0 flex-col items-center gap-2 border-l border-white/10 bg-[#16110d] py-3"
      >
        <EditorButton
          iconOnly
          tone="outline"
          label="פתיחת פאנל המקטעים"
          icon={<span aria-hidden>☰</span>}
          onClick={onToggle}
        />
        {warnings.length ? (
          <span
            title={`${warnings.length} התראות עיצוב`}
            className="rounded-full bg-[#E8A87C]/20 px-1.5 py-0.5 text-[10px] font-black text-[#E8A87C]"
          >
            {warnings.length}
          </span>
        ) : null}
      </aside>
    );
  }

  return (
    <aside
      dir="rtl"
      data-ww-chrome="1"
      className="flex h-full w-[300px] shrink-0 flex-col border-l border-white/10 bg-[#16110d] text-white"
      aria-label="מבנה האתר והגדרות"
    >
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-2">
        <div className="grid flex-1 grid-cols-3 gap-1" role="tablist" aria-label="לשוניות העורך">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTab(id)}
              className={`min-h-[36px] rounded-xl text-[11px] font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962] ${
                tab === id ? "bg-white/12 text-[#E8D5A8]" : "text-white/55 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <EditorButton
          iconOnly
          label="סגירת הפאנל"
          icon={<span aria-hidden>⟩</span>}
          onClick={onToggle}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "sections" ? (
          <>
            <EditorPanelSection title="מבנה האתר">
              <p className="text-[10px] font-semibold leading-4 text-white/40">
                גררו כדי לשנות סדר, לחצו על שם כדי לגלול אליו, ולחצו על העין כדי להסתיר.
              </p>
              <EditorSectionList warnings={warnings} onOpenSettings={onSelectSection} />
            </EditorPanelSection>
            {activeSectionId ? <EditorSectionSettings sectionId={activeSectionId} /> : null}
            <WarningsPanel warnings={warnings} />
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
          </>
        ) : null}
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        <p className="text-[10px] font-bold leading-4 text-white/40">
          {site?.content.coupleNames || "אתר החתונה"}
        </p>
      </div>
    </aside>
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

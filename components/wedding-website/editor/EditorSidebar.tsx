"use client";

import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import { isSectionVisible, SECTION_LABELS } from "@/lib/weddingWebsite/editorSchema";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import type { WeddingDemoContent } from "@/types/weddingWebsite";

type Tab = "sections" | "theme" | "settings";

export default function EditorSidebar({
  tab,
  onTab,
  content,
  publicPath,
  published,
  hasUnpublishedChanges,
  onPublish,
  onChangeTemplate,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  content: WeddingDemoContent;
  publicPath: string;
  published: boolean;
  hasUnpublishedChanges: boolean;
  onPublish: () => void;
  onChangeTemplate: () => void;
}) {
  const site = useWeddingSite();
  const order = content.sectionOrder?.length
    ? content.sectionOrder
    : WEDDING_SECTIONS.map((section) => section.id);

  return (
    <aside
      dir="rtl"
      data-ww-chrome="1"
      className="flex h-full w-[280px] shrink-0 flex-col border-l border-white/10 bg-[#16110d] text-white"
    >
      <div className="grid grid-cols-3 border-b border-white/10 text-[11px] font-black">
        {(
          [
            ["sections", "מקטעים"],
            ["theme", "עיצוב"],
            ["settings", "הגדרות"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={`px-2 py-3 ${tab === id ? "bg-white/10 text-[#E8D5A8]" : "text-white/60"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {tab === "sections" ? (
          <div className="space-y-1">
            {order.map((id) => {
              const visible = isSectionVisible(content, id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-2 py-2 text-xs"
                >
                  <button
                    type="button"
                    className="font-bold"
                    onClick={() => {
                      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      site?.editor?.setSelection({ type: "section", path: id, label: SECTION_LABELS[id] || id });
                    }}
                  >
                    {SECTION_LABELS[id] || id}
                  </button>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => site?.editor?.moveSection(id, -1)}>↑</button>
                    <button type="button" onClick={() => site?.editor?.moveSection(id, 1)}>↓</button>
                    <button type="button" onClick={() => site?.editor?.toggleSection(id, !visible)}>
                      {visible ? "👁" : "🚫"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {tab === "theme" ? (
          <div className="space-y-3 text-xs leading-6 text-white/70">
            <p>התבנית שומרת על המבנה המקצועי שלה.</p>
            <p>אפשר לשנות צבעים, פונטים, מדיה וסדר מקטעים — בלי לשבור את הלייאאוט.</p>
            <button
              type="button"
              onClick={onChangeTemplate}
              className="w-full rounded-xl border border-white/15 px-3 py-2 font-black text-white"
            >
              החלפת תבנית
            </button>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="space-y-3 text-xs leading-6 text-white/70">
            <p>אישור הגעה, הסעות והודעות לזוג נשארים מחוברים למערכת האמיתית. בעורך משנים רק כותרות ועיצוב.</p>
            <a
              href="/dashboard/guest-messages"
              className="block rounded-xl border border-white/15 px-3 py-2 text-center font-black text-white"
            >
              הודעות מהאורחים
            </a>
            <p>מתנות (Bit, אשראי, PayBox) מופיעות לפי הקישורים ומספר הטלפון ששמרתם בפרטי האירוע.</p>
            {publicPath ? (
              <a
                href={publicPath}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-white/15 px-3 py-2 text-center font-black text-white"
              >
                צפייה באתר החי
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 p-3">
        <p className="mb-2 text-[10px] font-bold text-white/45">
          {published ? "פורסם" : "טיוטה"} {hasUnpublishedChanges ? "· יש שינויים שלא פורסמו" : ""}
        </p>
        <button
          type="button"
          onClick={onPublish}
          className="w-full rounded-xl bg-[#C9A962] px-3 py-3 text-sm font-black text-[#1a1410]"
        >
          פרסום האתר
        </button>
      </div>
    </aside>
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

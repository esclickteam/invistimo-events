"use client";

import { BUILDER_THEMES } from "@/config/sitePageLibrary/builderThemes";
import type { SectionTemplateDefinition } from "@/types/sitePageLibrary";

type Props = {
  section: SectionTemplateDefinition;
  onAdd: (section: SectionTemplateDefinition) => void;
};

export default function SectionPreviewCard({ section, onAdd }: Props) {
  const theme = BUILDER_THEMES[section.themeId];

  return (
    <article className="group flex flex-col overflow-hidden rounded-[20px] border border-[#E3D6C3] bg-white shadow-[0_8px_24px_rgba(91,63,31,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(91,63,31,0.1)]">
      <div
        className="relative aspect-[16/9] overflow-hidden p-4"
        style={{ background: theme.bg }}
      >
        <div
          className="h-full rounded-xl border p-3"
          style={{
            background: theme.surface,
            borderColor: theme.border,
          }}
        >
          <div
            className="mb-2 h-2 w-20 rounded"
            style={{ background: theme.accent }}
          />
          <div
            className="mb-1 h-1.5 w-full rounded"
            style={{ background: theme.bgAlt }}
          />
          <div
            className="h-1.5 w-3/4 rounded"
            style={{ background: theme.bgAlt }}
          />
          <div
            className="mt-3 h-6 w-full rounded-lg"
            style={{ background: theme.accentSoft }}
          />
        </div>

        <span className="absolute left-2 top-2 rounded-full bg-[#241A14]/70 px-2 py-0.5 text-[9px] font-black text-white">
          {section.category}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2 border-t border-[#F0E8DC] p-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-[#241A14]">{section.label}</h4>
          <p className="mt-0.5 text-[11px] font-bold text-[#8A7B69]">
            {section.description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAdd(section)}
          className="shrink-0 rounded-xl bg-[#B8844F] px-3 py-1.5 text-xs font-black text-white transition hover:bg-[#96703A]"
        >
          + הוספה
        </button>
      </div>
    </article>
  );
}

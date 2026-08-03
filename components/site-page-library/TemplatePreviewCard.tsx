"use client";

import { BUILDER_THEMES } from "@/config/sitePageLibrary/builderThemes";
import type { PageTemplateDefinition } from "@/types/sitePageLibrary";

type Props = {
  template: PageTemplateDefinition;
  onAdd: (template: PageTemplateDefinition) => void;
};

export default function TemplatePreviewCard({ template, onAdd }: Props) {
  const theme = BUILDER_THEMES[template.themeId];

  const isForm =
    template.formType === "login" || template.formType === "register";

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-[20px] border border-[#E3D6C3] bg-white shadow-[0_8px_24px_rgba(91,63,31,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(91,63,31,0.1)]"
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: theme.bg }}
      >
        {/* Header strip */}
        <div
          className="h-[28%] px-3 py-2"
          style={{ background: theme.headerBg }}
        >
          <div
            className="h-2 w-16 rounded-full opacity-80"
            style={{ background: "rgba(255,255,255,0.7)" }}
          />
          <div
            className="mt-1.5 h-1.5 w-24 rounded-full opacity-50"
            style={{ background: "rgba(255,255,255,0.5)" }}
          />
        </div>

        {/* Body mockup */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          {template.layout === "hero-form" && (
            <>
              <div
                className="h-8 rounded-lg"
                style={{ background: theme.accentSoft }}
              />
              {isForm && (
                <div
                  className="mx-auto mt-2 w-[70%] space-y-1.5 rounded-xl border p-2"
                  style={{
                    background: theme.surface,
                    borderColor: theme.border,
                  }}
                >
                  <div
                    className="h-2 w-full rounded"
                    style={{ background: theme.bgAlt }}
                  />
                  <div
                    className="h-2 w-full rounded"
                    style={{ background: theme.bgAlt }}
                  />
                  <div
                    className="mx-auto mt-1 h-3 w-12 rounded-md"
                    style={{ background: theme.accent }}
                  />
                </div>
              )}
            </>
          )}

          {template.layout === "split-form" && (
            <div className="flex h-full gap-2">
              <div
                className="w-1/2 rounded-lg"
                style={{ background: theme.accentSoft }}
              />
              <div
                className="w-1/2 space-y-1 rounded-lg border p-1.5"
                style={{
                  background: theme.surface,
                  borderColor: theme.border,
                }}
              >
                <div
                  className="h-1.5 w-full rounded"
                  style={{ background: theme.bgAlt }}
                />
                <div
                  className="h-1.5 w-full rounded"
                  style={{ background: theme.bgAlt }}
                />
                <div
                  className="h-2 w-8 rounded"
                  style={{ background: theme.accent }}
                />
              </div>
            </div>
          )}

          {template.layout === "card-form" && (
            <div
              className="mx-auto w-[75%] space-y-1.5 rounded-xl border p-2.5 shadow-sm"
              style={{
                background: theme.surface,
                borderColor: theme.border,
              }}
            >
              <div
                className="mx-auto h-1.5 w-10 rounded"
                style={{ background: theme.accent }}
              />
              <div
                className="h-1.5 w-full rounded"
                style={{ background: theme.bgAlt }}
              />
              <div
                className="h-1.5 w-full rounded"
                style={{ background: theme.bgAlt }}
              />
              <div
                className="mx-auto h-2.5 w-14 rounded-md"
                style={{ background: theme.accent }}
              />
            </div>
          )}

          {template.layout === "minimal-form" && (
            <div className="space-y-1.5 px-4">
              <div
                className="h-1.5 w-16 rounded"
                style={{ background: theme.text }}
              />
              <div
                className="h-1 w-full rounded border-b"
                style={{ borderColor: theme.border }}
              />
              <div
                className="h-1 w-full rounded border-b"
                style={{ borderColor: theme.border }}
              />
              <div
                className="mt-2 h-2.5 w-12 rounded"
                style={{ background: theme.accent }}
              />
            </div>
          )}

          {template.layout === "dashboard" && (
            <div className="grid grid-cols-2 gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-6 rounded-lg border"
                  style={{
                    background: theme.surface,
                    borderColor: theme.border,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {template.requiresAuth && (
          <span className="absolute left-2 top-2 rounded-full bg-[#241A14]/75 px-2 py-0.5 text-[9px] font-black text-white">
            🔒 אחרי התחברות
          </span>
        )}

        {isForm && (
          <span className="absolute right-2 top-2 rounded-full bg-[#B8844F] px-2 py-0.5 text-[9px] font-black text-white">
            {template.formType === "login" ? "התחברות" : "הרשמה"}
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 border-t border-[#F0E8DC] p-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-black text-[#241A14]">
            {template.title}
          </h4>
          <p className="mt-0.5 text-[11px] font-bold text-[#8A7B69]">
            {template.subtitle} · {template.sectionCount} סקשנים
          </p>
          <p className="mt-1 truncate text-[10px] font-semibold text-[#B8844F]">
            {template.route}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAdd(template)}
          className="shrink-0 rounded-xl bg-[#B8844F] px-3 py-1.5 text-xs font-black text-white transition hover:bg-[#96703A]"
        >
          + הוספה
        </button>
      </div>
    </article>
  );
}

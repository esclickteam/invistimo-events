"use client";

import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import { WEDDING_EDITOR_FONTS } from "@/lib/weddingWebsite/fonts";
import {
  WEDDING_RADIUS_LABELS,
  WEDDING_RADIUS_STYLES,
  WEDDING_SPACING_LABELS,
  WEDDING_SPACING_STYLES,
  WEDDING_THEME_ROLE_LABELS,
  WEDDING_THEME_ROLE_ORDER,
  resolveWeddingPalette,
  weddingThemeRoleCoverage,
  type WeddingRadiusStyle,
  type WeddingSpacingStyle,
} from "@/lib/weddingWebsite/editorTheme";
import EditorColorField from "./EditorColorField";
import { EditorButton, EditorField, EditorPanelSection, EditorSelect } from "./EditorUI";

const FONT_GROUPS = [
  {
    label: "מותאם לעברית",
    options: WEDDING_EDITOR_FONTS.filter((font) => font.rtl).map((font) => ({
      value: font.family,
      label: font.label,
    })),
  },
  {
    label: "לטיני / דקורטיבי",
    options: WEDDING_EDITOR_FONTS.filter((font) => !font.rtl).map((font) => ({
      value: font.family,
      label: font.label,
    })),
  },
];

export default function EditorThemePanel({
  templateName,
  onChangeTemplate,
}: {
  templateName: string;
  onChangeTemplate: () => void;
}) {
  const site = useWeddingSite();
  const editor = site?.editor;
  if (!site || !editor) return null;

  const theme = site.content.theme || {};
  const palette = resolveWeddingPalette(site.template, theme);
  const coverage = weddingThemeRoleCoverage(site.template.id);

  return (
    <div>
      <EditorPanelSection title="תבנית">
        <div className="rounded-xl bg-white/[0.06] p-3">
          <p className="text-[10px] font-black text-white/45">התבנית הנוכחית</p>
          <p className="mt-0.5 text-sm font-black text-white">{templateName}</p>
        </div>
        <EditorButton
          tone="outline"
          label="החלפת תבנית"
          className="w-full"
          onClick={onChangeTemplate}
        />
      </EditorPanelSection>

      <EditorPanelSection title="צבעים">
        {WEDDING_THEME_ROLE_ORDER.map((role) => (
          <div key={role} className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-white/70">
              {WEDDING_THEME_ROLE_LABELS[role]}
              {coverage.has(role) ? null : (
                <span className="mr-1 text-[9px] font-bold text-white/35">
                  (התבנית לא משתמשת בגוון זה)
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] text-white/40">{palette[role]}</span>
              <EditorColorField
                compact
                label={WEDDING_THEME_ROLE_LABELS[role]}
                value={theme.colors?.[role] || ""}
                onChange={(color) => editor.updateTheme({ colors: { [role]: color } })}
              />
            </div>
          </div>
        ))}
      </EditorPanelSection>

      <EditorPanelSection title="טיפוגרפיה">
        <EditorField label="פונט כותרות">
          <EditorSelect
            label="פונט כותרות"
            value={theme.headingFont || ""}
            onChange={(headingFont) => editor.updateTheme({ headingFont })}
            options={[{ value: "", label: "פונט התבנית" }]}
            groups={FONT_GROUPS}
          />
        </EditorField>
        <EditorField label="פונט טקסט">
          <EditorSelect
            label="פונט טקסט"
            value={theme.bodyFont || ""}
            onChange={(bodyFont) => editor.updateTheme({ bodyFont })}
            options={[{ value: "", label: "פונט התבנית" }]}
            groups={FONT_GROUPS}
          />
        </EditorField>
        <p className="text-[10px] font-semibold leading-4 text-white/40">
          שינוי כאן משפיע על כל האתר. אפשר עדיין לשנות פונט לטקסט מסוים בלחיצה עליו ב-canvas.
        </p>
      </EditorPanelSection>

      <EditorPanelSection title="כפתורים ומסגרות">
        <EditorField label="סגנון פינות">
          <EditorSelect
            label="סגנון פינות"
            value={theme.radius || "template"}
            onChange={(radius) => editor.updateTheme({ radius: radius as WeddingRadiusStyle })}
            options={WEDDING_RADIUS_STYLES.map((style) => ({
              value: style,
              label: WEDDING_RADIUS_LABELS[style],
            }))}
          />
        </EditorField>
        <EditorField label="ריווח בין מקטעים">
          <EditorSelect
            label="ריווח בין מקטעים"
            value={theme.spacing || "template"}
            onChange={(spacing) => editor.updateTheme({ spacing: spacing as WeddingSpacingStyle })}
            options={WEDDING_SPACING_STYLES.map((style) => ({
              value: style,
              label: WEDDING_SPACING_LABELS[style],
            }))}
          />
        </EditorField>
      </EditorPanelSection>

      <EditorPanelSection title="איפוס">
        <EditorButton
          tone="danger"
          label="חזרה לעיצוב המקורי של התבנית"
          className="w-full"
          onClick={() =>
            editor.confirm({
              title: "חזרה לעיצוב המקורי",
              message:
                "כל שינויי הצבעים, הפונטים והריווח שביצעתם יימחקו. הטקסטים, התמונות והגלריה יישמרו.",
              confirmLabel: "איפוס העיצוב",
              tone: "danger",
              onConfirm: () => editor.updateTheme(null),
            })
          }
        />
      </EditorPanelSection>
    </div>
  );
}

"use client";

import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import { editorSection, type SectionSettingKey } from "@/lib/weddingWebsite/editorSections";
import { resolveMediaSlot } from "@/lib/weddingWebsite/media";
import EditorColorField from "./EditorColorField";
import {
  EditorButton,
  EditorField,
  EditorPanelSection,
  EditorSegmented,
  EditorSlider,
} from "./EditorUI";
import type { WeddingSectionAlign } from "@/types/weddingWebsite";

const SPACING_PRESETS: Array<{ value: string; label: string }> = [
  { value: "", label: "תבנית" },
  { value: "2rem", label: "צפוף" },
  { value: "5rem", label: "בינוני" },
  { value: "8rem", label: "מרווח" },
];

const WIDTH_PRESETS: Array<{ value: string; label: string }> = [
  { value: "", label: "תבנית" },
  { value: "48rem", label: "צר" },
  { value: "64rem", label: "בינוני" },
  { value: "80rem", label: "רחב" },
];

/**
 * Shows only the controls that make sense for the selected section. Business
 * rules never appear here: RSVP, transport and guest messages stay wired to the
 * real system and expose presentation only.
 */
export default function EditorSectionSettings({ sectionId }: { sectionId: string }) {
  const site = useWeddingSite();
  const editor = site?.editor;
  const meta = editorSection(sectionId);
  if (!site || !editor || !meta) return null;

  const style = site.content.sectionStyles?.[sectionId] || {};
  const has = (key: SectionSettingKey) => meta.settings.includes(key);
  const mobile = editor.device === "mobile";

  const api = editor;
  function patch(next: Parameters<typeof api.updateSectionStyle>[1]) {
    api.updateSectionStyle(sectionId, next);
  }

  return (
    <div>
      <EditorPanelSection
        title={`מקטע · ${meta.label}`}
        action={
          <EditorButton
            label="איפוס"
            tone="ghost"
            onClick={() =>
              editor.confirm({
                title: "איפוס מקטע",
                message: `שינויי העיצוב במקטע "${meta.label}" יימחקו. התוכן יישמר.`,
                confirmLabel: "איפוס המקטע",
                tone: "danger",
                onConfirm: () => editor.resetSection(sectionId),
              })
            }
          />
        }
      >
        {meta.hint ? (
          <p className="rounded-xl bg-white/[0.06] p-2.5 text-[11px] font-semibold leading-5 text-white/60">
            {meta.hint}
          </p>
        ) : null}

        {meta.dynamic ? (
          <a
            href="/dashboard/edit-invitation"
            className="block rounded-xl border border-[#3D8BBA]/40 bg-[#3D8BBA]/10 p-2.5 text-[11px] font-black text-[#9FD2F0] hover:bg-[#3D8BBA]/20"
          >
            עריכת פרטי האירוע ←
          </a>
        ) : null}
      </EditorPanelSection>

      {has("media") ? (
        <EditorPanelSection title="מדיה">
          <MediaSummary slotId={sectionId === "hero" ? "hero" : sectionId} />
        </EditorPanelSection>
      ) : null}

      {sectionId === "hero" ? (
        <EditorPanelSection title="גובה וכיסוי">
          <EditorSlider
            label={mobile ? "גובה במובייל" : "גובה במחשב"}
            min={40}
            max={130}
            suffix="%"
            value={(mobile ? style.heroHeightMobile : style.heroHeight) || 100}
            onChange={(value) =>
              patch(mobile ? { heroHeightMobile: value } : { heroHeight: value })
            }
          />
          <EditorSlider
            label="כיסוי כהה על התמונה"
            min={0}
            max={100}
            suffix="%"
            value={style.overlayOpacity ?? 100}
            onChange={(overlayOpacity) => patch({ overlayOpacity })}
          />
          <p className="text-[10px] font-semibold leading-4 text-white/40">
            כיסוי גבוה יותר עוזר לטקסט להישאר קריא מעל התמונה.
          </p>
        </EditorPanelSection>
      ) : null}

      <EditorPanelSection title="פריסה">
        {has("align") ? (
          <EditorField label="יישור">
            <EditorSegmented<WeddingSectionAlign | "">
              label="יישור המקטע"
              value={style.align || ""}
              onChange={(align) => patch({ align: align || undefined })}
              options={[
                { value: "", label: "תבנית" },
                { value: "right", label: "ימין" },
                { value: "center", label: "מרכז" },
                { value: "left", label: "שמאל" },
              ]}
            />
          </EditorField>
        ) : null}

        {has("width") ? (
          <EditorField label="רוחב התוכן">
            <EditorSegmented
              label="רוחב התוכן"
              value={style.width || ""}
              onChange={(width) => patch({ width: width || undefined })}
              options={WIDTH_PRESETS}
            />
          </EditorField>
        ) : null}

        {has("spacing") ? (
          <>
            <EditorField label="ריווח עליון">
              <EditorSegmented
                label="ריווח עליון"
                value={style.paddingTop || ""}
                onChange={(paddingTop) => patch({ paddingTop: paddingTop || undefined })}
                options={SPACING_PRESETS}
              />
            </EditorField>
            <EditorField label="ריווח תחתון">
              <EditorSegmented
                label="ריווח תחתון"
                value={style.paddingBottom || ""}
                onChange={(paddingBottom) => patch({ paddingBottom: paddingBottom || undefined })}
                options={SPACING_PRESETS}
              />
            </EditorField>
          </>
        ) : null}

        {has("columns") ? (
          <EditorSlider
            label="מספר עמודות"
            min={1}
            max={5}
            value={style.columns || 3}
            onChange={(columns) => patch({ columns })}
          />
        ) : null}

        {has("gap") ? (
          <EditorField label="מרווח בין תמונות">
            <EditorSegmented
              label="מרווח בין תמונות"
              value={style.gap || ""}
              onChange={(gap) => patch({ gap: gap || undefined })}
              options={[
                { value: "", label: "תבנית" },
                { value: "4px", label: "צמוד" },
                { value: "16px", label: "בינוני" },
                { value: "32px", label: "מרווח" },
              ]}
            />
          </EditorField>
        ) : null}

        {has("radius") ? (
          <EditorField label="עיגול פינות">
            <EditorSegmented
              label="עיגול פינות"
              value={style.radius || ""}
              onChange={(radius) => patch({ radius: radius || undefined })}
              options={[
                { value: "", label: "תבנית" },
                { value: "0px", label: "חד" },
                { value: "16px", label: "רך" },
                { value: "32px", label: "מעוגל" },
              ]}
            />
          </EditorField>
        ) : null}

        {has("imageFit") ? (
          <EditorField label="התאמת תמונות" hint="חיתוך ממלא את המסגרת, התאמה מציגה את כל התמונה.">
            <EditorSegmented
              label="התאמת תמונות"
              value={style.imageFit || ""}
              onChange={(imageFit) =>
                patch({ imageFit: (imageFit || undefined) as "cover" | "contain" | undefined })
              }
              options={[
                { value: "", label: "תבנית" },
                { value: "cover", label: "חיתוך" },
                { value: "contain", label: "התאמה" },
              ]}
            />
          </EditorField>
        ) : null}
      </EditorPanelSection>

      {has("background") ? (
        <EditorPanelSection title="רקע">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-white/60">צבע רקע המקטע</span>
            <EditorColorField
              label="צבע רקע המקטע"
              compact
              value={style.backgroundColor || ""}
              onChange={(backgroundColor) => patch({ backgroundColor: backgroundColor || undefined })}
              onApplyToTheme={(role, color) => editor.updateTheme({ colors: { [role]: color } })}
            />
          </div>
          {sectionId === "rsvp" ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] font-black text-white/60">רקע כרטיס התודה / הטופס</span>
              <EditorColorField
                label="רקע כרטיס RSVP"
                compact
                value={style.cardBackgroundColor || ""}
                against={style.cardBackgroundColor || style.backgroundColor || site.template.theme.bg}
                onChange={(cardBackgroundColor) =>
                  patch({ cardBackgroundColor: cardBackgroundColor || undefined })
                }
                onApplyToTheme={(role, color) => editor.updateTheme({ colors: { [role]: color } })}
              />
            </div>
          ) : null}
        </EditorPanelSection>
      ) : null}
    </div>
  );
}

function MediaSummary({ slotId }: { slotId: string }) {
  const site = useWeddingSite();
  const editor = site?.editor;
  const slot = resolveMediaSlot(slotId, site?.content, site?.template.heroImage || "");

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-white/12 bg-black/30">
        {slot?.src ? (
          slot.type === "video" ? (
            <video src={slot.src} muted className="h-24 w-full object-cover" />
          ) : (
            <img src={slot.src} alt="" className="h-24 w-full object-cover" />
          )
        ) : (
          <p className="p-4 text-center text-[11px] font-bold text-white/40">אין מדיה במקטע</p>
        )}
      </div>
      <EditorButton
        tone="outline"
        label="בחירה מספריית המדיה"
        className="w-full"
        onClick={() => editor?.pickFromLibrary(slotId)}
      />
      <p className="text-[10px] font-semibold leading-4 text-white/40">
        אפשר גם ללחוץ ישירות על התמונה בתוך האתר כדי להחליף, לחתוך או להזיז אותה.
      </p>
    </div>
  );
}

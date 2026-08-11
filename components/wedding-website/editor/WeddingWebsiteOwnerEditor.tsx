"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  WEDDING_TEMPLATES,
  WEDDING_SECTIONS,
} from "@/config/weddingWebsite/templates";
import {
  WW_FONT_OPTIONS,
  WW_IMAGES,
  WW_STYLE_PRESETS,
  WW_VIDEOS,
  sanitizeGallery,
} from "@/config/weddingWebsite/media";
import { getDemoWeddingSiteContent } from "@/lib/weddingWebsite/resolveWeddingSiteContent";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import { SafeImage } from "@/components/wedding-website/shared/SafeMedia";
import type {
  WeddingSectionToggles,
  WeddingSiteContent,
  WeddingTemplateId,
  WeddingThemeOverrides,
} from "@/types/weddingWebsite";

export type OwnerEditorWebsite = {
  id: string;
  shareId: string;
  templateId: WeddingTemplateId;
  status: "draft" | "published";
  content: Partial<WeddingSiteContent>;
  sections: WeddingSectionToggles;
  themeOverrides?: WeddingThemeOverrides;
  publicPath: string;
  resolvedContent?: WeddingSiteContent;
};

type Props = {
  website: OwnerEditorWebsite;
  inviteMeta: {
    shareId: string;
    title: string;
    invitePath: string;
  };
  invitationId: string;
  onSaved: (website: OwnerEditorWebsite) => void;
};

const inputClass =
  "w-full rounded-xl border border-[#E7DED1] bg-white px-3 py-2.5 text-sm font-semibold text-[#241A14] outline-none focus:border-[#D9B46F]";

const SECTION_KEYS = [
  "hero",
  "countdown",
  "invitation",
  "our-story",
  "gallery",
  "video",
  "schedule",
  "location",
  "transportation",
  "rsvp",
  "faq",
  "gifts",
  "contact",
  "footer",
] as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-[#8A7B69]">{label}</span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#EFE4D6] bg-[#FCFAF6] px-3 py-2">
      <span className="text-xs font-black text-[#8A7B69]">{label}</span>
      <input
        type="color"
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
      />
    </label>
  );
}

export default function WeddingWebsiteOwnerEditor({
  website,
  inviteMeta,
  invitationId,
  onSaved,
}: Props) {
  const [tab, setTab] = useState<"content" | "colors" | "type" | "media" | "sections">(
    "content"
  );
  const [templateId, setTemplateId] = useState<WeddingTemplateId>(website.templateId);
  const [draftContent, setDraftContent] = useState<Partial<WeddingSiteContent>>(
    website.content || {}
  );
  const [sections, setSections] = useState<WeddingSectionToggles>(website.sections || {});
  const [themeOverrides, setThemeOverrides] = useState<WeddingThemeOverrides>(
    website.themeOverrides || {}
  );
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(website.status);

  useEffect(() => {
    setTemplateId(website.templateId);
    setDraftContent(website.content || {});
    setSections(website.sections || {});
    setThemeOverrides(website.themeOverrides || {});
    setStatus(website.status);
  }, [website]);

  const template = useMemo(
    () => WEDDING_TEMPLATES.find((t) => t.id === templateId) || WEDDING_TEMPLATES[0],
    [templateId]
  );

  const previewContent = useMemo(() => {
    const base = website.resolvedContent || getDemoWeddingSiteContent(templateId);
    return {
      ...base,
      ...draftContent,
      storyParagraphs:
        draftContent.storyParagraphs && draftContent.storyParagraphs.length > 0
          ? draftContent.storyParagraphs
          : base.storyParagraphs,
      schedule:
        draftContent.schedule && draftContent.schedule.length > 0
          ? draftContent.schedule
          : base.schedule,
      transportation:
        draftContent.transportation && draftContent.transportation.length > 0
          ? draftContent.transportation
          : base.transportation,
      faq: draftContent.faq && draftContent.faq.length > 0 ? draftContent.faq : base.faq,
      galleryUrls: sanitizeGallery(
        draftContent.galleryUrls?.length
          ? draftContent.galleryUrls
          : base.galleryUrls?.length
            ? base.galleryUrls
            : template.galleryImages,
        template.galleryImages
      ),
      heroImageUrl:
        draftContent.heroImageUrl || base.heroImageUrl || template.heroImage,
      videoUrl: draftContent.videoUrl || base.videoUrl || WW_VIDEOS.romantic,
    } as WeddingSiteContent;
  }, [draftContent, website.resolvedContent, templateId, template]);

  const updateField = <K extends keyof WeddingSiteContent>(
    key: K,
    value: WeddingSiteContent[K]
  ) => {
    setDraftContent((prev) => ({ ...prev, [key]: value }));
  };

  const updateTheme = <K extends keyof WeddingThemeOverrides>(
    key: K,
    value: WeddingThemeOverrides[K]
  ) => {
    setThemeOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const gallery = sanitizeGallery(
    draftContent.galleryUrls?.length
      ? draftContent.galleryUrls
      : template.galleryImages,
    template.galleryImages
  );

  const save = async (extra: Record<string, unknown> = {}) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/wedding-website/${website.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          content: draftContent,
          sections,
          themeOverrides,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(data.error || "שמירה נכשלה");
        return;
      }
      setStatus(data.website.status);
      onSaved({
        ...website,
        ...data.website,
        resolvedContent: website.resolvedContent,
      });
      setMessage("נשמר בהצלחה — השינוי חל רק על אתר החתונה");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "content" as const, label: "תוכן" },
    { id: "colors" as const, label: "צבעים" },
    { id: "type" as const, label: "טיפוגרפיה" },
    { id: "media" as const, label: "מדיה" },
    { id: "sections" as const, label: "סקשנים" },
  ];

  const previewUrl =
    status === "published"
      ? `/w/${website.shareId}`
      : `/w/${website.shareId}?preview=1`;

  return (
    <div dir="rtl" className="space-y-5">
      <div className="rounded-[28px] border border-[#E3D0B8] bg-[#FFFDF9] p-5 shadow-sm">
        <p className="text-xs font-black text-[#B8844F]">עריכת אתר החתונה · מוצר נפרד מההזמנה</p>
        <h1 className="mt-1 text-3xl font-black text-[#241A14]">עריכת אתר החתונה</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-[#8A7B69]">
          שינויים נשמרים ב-DB של אתר החתונה בלבד. קישור ההזמנה הרגילה{" "}
          <span className="font-black text-[#241A14]">{inviteMeta.invitePath}</span> לא משתנה.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-full bg-[#241A14] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
          {status === "published" ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save({ status: "draft" })}
              className="rounded-full border border-[#E7DED1] bg-white px-5 py-2.5 text-sm font-black text-[#8A7B69]"
            >
              בטל פרסום
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save({ status: "published" })}
              className="rounded-full bg-[#B8844F] px-5 py-2.5 text-sm font-black text-white"
            >
              פרסם אתר
            </button>
          )}
          <Link
            href={previewUrl}
            target="_blank"
            className="rounded-full border border-[#D9B46F] bg-[#FFF9EF] px-5 py-2.5 text-sm font-black text-[#8B5E34]"
          >
            פתח /w/{website.shareId}
          </Link>
          <Link
            href={`/dashboard/invitations/${invitationId}/edit`}
            className="rounded-full px-4 py-2.5 text-sm font-bold text-[#8A7B69]"
          >
            חזרה להזמנה
          </Link>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-[#B8844F]">{message}</p> : null}
      </div>

      <section className="rounded-[28px] border border-[#E7DED1] bg-white p-5">
        <h2 className="mb-3 text-base font-black text-[#241A14]">בחירת תבנית</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {WEDDING_TEMPLATES.map((t) => {
            const selected = templateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={`overflow-hidden rounded-2xl border text-right transition ${
                  selected
                    ? "border-[#D9B46F] bg-[#FFF9EF] ring-2 ring-[#D9B46F]/40"
                    : "border-[#EFE4D6] bg-[#FCFAF6]"
                }`}
              >
                <SafeImage
                  src={t.previewImage}
                  alt={t.name}
                  className="h-20 w-full object-cover"
                />
                <div className="p-2.5">
                  <p className="text-xs font-black text-[#241A14]">{t.name}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[#8A7B69]">{t.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  tab === t.id
                    ? "bg-[#241A14] text-white"
                    : "bg-[#F4EEE4] text-[#8A7B69]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 rounded-[28px] border border-[#E7DED1] bg-white p-5">
            {tab === "content" && (
              <>
                <Field label="שמות הזוג">
                  <input
                    className={inputClass}
                    value={draftContent.coupleNames || ""}
                    onChange={(e) => updateField("coupleNames", e.target.value)}
                    placeholder={inviteMeta.title}
                  />
                </Field>
                <Field label="כותרת ראשית / משפט פתיחה">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={draftContent.heroSubtitle || ""}
                    onChange={(e) => updateField("heroSubtitle", e.target.value)}
                  />
                </Field>
                <Field label="טקסט פתיחה / הזמנה">
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={draftContent.invitationText || ""}
                    onChange={(e) => updateField("invitationText", e.target.value)}
                  />
                </Field>
                <Field label="סיפור / About (שורה = פסקה)">
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={(draftContent.storyParagraphs || []).join("\n")}
                    onChange={(e) =>
                      updateField(
                        "storyParagraphs",
                        e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </Field>
                <Field label="טקסט RSVP">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={draftContent.rsvpText || ""}
                    onChange={(e) => updateField("rsvpText", e.target.value)}
                  />
                </Field>
                <Field label="טקסט הסעות (כל שורה: כותרת | תיאור)">
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={(draftContent.transportation || [])
                      .map((t) => `${t.title} | ${t.description}`)
                      .join("\n")}
                    onChange={(e) =>
                      updateField(
                        "transportation",
                        e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [title, ...rest] = line.split("|");
                            return {
                              title: (title || "").trim(),
                              description: rest.join("|").trim(),
                            };
                          })
                      )
                    }
                  />
                </Field>
                <Field label="טקסט חניה">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={draftContent.parkingText || ""}
                    onChange={(e) => updateField("parkingText", e.target.value)}
                  />
                </Field>
                <Field label="לו״ז (שעה | כותרת | תיאור)">
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={(draftContent.schedule || [])
                      .map((s) => `${s.time} | ${s.title} | ${s.description}`)
                      .join("\n")}
                    onChange={(e) =>
                      updateField(
                        "schedule",
                        e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [time, title, ...rest] = line.split("|");
                            return {
                              time: (time || "").trim(),
                              title: (title || "").trim(),
                              description: rest.join("|").trim(),
                            };
                          })
                      )
                    }
                  />
                </Field>
                <Field label="FAQ (שאלה | תשובה)">
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={(draftContent.faq || [])
                      .map((f) => `${f.question} | ${f.answer}`)
                      .join("\n")}
                    onChange={(e) =>
                      updateField(
                        "faq",
                        e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [question, ...rest] = line.split("|");
                            return {
                              question: (question || "").trim(),
                              answer: rest.join("|").trim(),
                            };
                          })
                      )
                    }
                  />
                </Field>
                <Field label="מתנות">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={draftContent.giftsNote || ""}
                    onChange={(e) => updateField("giftsNote", e.target.value)}
                  />
                </Field>
                <Field label="פרטי קשר / טלפון">
                  <input
                    className={inputClass}
                    value={draftContent.contactPhone || ""}
                    onChange={(e) => updateField("contactPhone", e.target.value)}
                  />
                </Field>
                <Field label="הערת קשר">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={draftContent.contactNote || ""}
                    onChange={(e) => updateField("contactNote", e.target.value)}
                  />
                </Field>
                <Field label="Footer text">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={draftContent.footerNote || ""}
                    onChange={(e) => updateField("footerNote", e.target.value)}
                  />
                </Field>
              </>
            )}

            {tab === "colors" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorField
                  label="רקע ראשי"
                  value={themeOverrides.background || template.theme.bg}
                  onChange={(v) => updateTheme("background", v)}
                />
                <ColorField
                  label="צבע משני"
                  value={themeOverrides.secondary || template.theme.bgAlt}
                  onChange={(v) => updateTheme("secondary", v)}
                />
                <ColorField
                  label="Accent"
                  value={themeOverrides.accent || template.theme.accent}
                  onChange={(v) => updateTheme("accent", v)}
                />
                <ColorField
                  label="טקסט"
                  value={themeOverrides.text || template.theme.text}
                  onChange={(v) => updateTheme("text", v)}
                />
                <ColorField
                  label="כפתורים"
                  value={themeOverrides.button || template.theme.accent}
                  onChange={(v) => updateTheme("button", v)}
                />
                <ColorField
                  label="Sections / Cards"
                  value={themeOverrides.card || template.theme.surface}
                  onChange={(v) => updateTheme("card", v)}
                />
                <button
                  type="button"
                  className="sm:col-span-2 rounded-full border border-[#E7DED1] px-4 py-2 text-xs font-black text-[#8A7B69]"
                  onClick={() => setThemeOverrides({})}
                >
                  איפוס צבעים לברירת התבנית ({template.name})
                </button>
              </div>
            )}

            {tab === "type" && (
              <div className="space-y-4">
                <Field label="Font מאושר">
                  <select
                    className={inputClass}
                    value={themeOverrides.fontFamily || ""}
                    onChange={(e) => updateTheme("fontFamily", e.target.value)}
                  >
                    <option value="">ברירת התבנית</option>
                    {WW_FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`גודל כותרות (${themeOverrides.headingScale || 1}x)`}>
                  <input
                    type="range"
                    min={0.85}
                    max={1.35}
                    step={0.05}
                    value={themeOverrides.headingScale || 1}
                    onChange={(e) =>
                      updateTheme("headingScale", Number(e.target.value))
                    }
                    className="w-full"
                  />
                </Field>
                <Field label="Style preset">
                  <div className="flex flex-wrap gap-2">
                    {WW_STYLE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updateTheme("stylePreset", p.id)}
                        className={`rounded-full px-4 py-2 text-xs font-black ${
                          themeOverrides.stylePreset === p.id
                            ? "bg-[#241A14] text-white"
                            : "bg-[#F4EEE4] text-[#8A7B69]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {tab === "media" && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-black text-[#8A7B69]">תמונת Hero</p>
                  <SafeImage
                    src={draftContent.heroImageUrl || template.heroImage}
                    alt="hero"
                    className="mb-3 h-36 w-full rounded-2xl object-cover"
                  />
                  <div className="grid grid-cols-4 gap-2 md:grid-cols-5">
                    {Object.values(WW_IMAGES).map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => updateField("heroImageUrl", url)}
                        className={`overflow-hidden rounded-lg border ${
                          (draftContent.heroImageUrl || template.heroImage) === url
                            ? "border-[#D9B46F] ring-2 ring-[#D9B46F]/50"
                            : "border-transparent"
                        }`}
                      >
                        <SafeImage src={url} alt="" className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <Field label="או URL מותאם">
                    <input
                      className={inputClass}
                      value={draftContent.heroImageUrl || ""}
                      onChange={(e) => updateField("heroImageUrl", e.target.value)}
                    />
                  </Field>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black text-[#8A7B69]">גלריה — החלף / מחק / סדר</p>
                  <div className="space-y-2">
                    {gallery.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="flex items-center gap-2 rounded-xl border border-[#EFE4D6] p-2"
                      >
                        <SafeImage src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                        <input
                          className={`${inputClass} flex-1`}
                          value={url}
                          onChange={(e) => {
                            const next = [...gallery];
                            next[idx] = e.target.value;
                            updateField("galleryUrls", next.filter(Boolean));
                          }}
                        />
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-xs font-black text-[#8A7B69]"
                          disabled={idx === 0}
                          onClick={() => {
                            const next = [...gallery];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            updateField("galleryUrls", next);
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-xs font-black text-[#8A7B69]"
                          disabled={idx === gallery.length - 1}
                          onClick={() => {
                            const next = [...gallery];
                            [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                            updateField("galleryUrls", next);
                          }}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-xs font-black text-red-600"
                          onClick={() =>
                            updateField(
                              "galleryUrls",
                              gallery.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          מחק
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mb-2 mt-3 text-xs font-black text-[#8A7B69]">הוסף מתמונות מאושרות</p>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.values(WW_IMAGES).map((url) => (
                      <button
                        key={`add-${url}`}
                        type="button"
                        onClick={() =>
                          updateField("galleryUrls", sanitizeGallery([...gallery, url]))
                        }
                        className="overflow-hidden rounded-lg border border-[#EFE4D6]"
                      >
                        <SafeImage src={url} alt="" className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="וידאו (URL מקומי או חיצוני)">
                  <select
                    className={inputClass}
                    value={draftContent.videoUrl || ""}
                    onChange={(e) => updateField("videoUrl", e.target.value)}
                  >
                    <option value="">ברירת תבנית</option>
                    {Object.entries(WW_VIDEOS).map(([k, v]) => (
                      <option key={k} value={v}>
                        {k}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {tab === "sections" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#8A7B69]">
                  כיבוי/הדלקה לכל סקשן. סדר הבסיס נקבע לפי התבנית שנבחרה.
                </p>
                {SECTION_KEYS.map((id) => {
                  const meta = WEDDING_SECTIONS.find((s) => s.id === id);
                  const enabled = sections[id] !== false;
                  return (
                    <label
                      key={id}
                      className="flex items-center justify-between rounded-xl border border-[#EFE4D6] px-3 py-2.5"
                    >
                      <span className="text-sm font-bold text-[#241A14]">
                        {meta?.label || id}
                      </span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) =>
                          setSections((prev) => ({ ...prev, [id]: e.target.checked }))
                        }
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-[#241A14]">Live Preview</h2>
            <div className="flex gap-1 rounded-full bg-[#F4EEE4] p-1">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  previewMode === "desktop" ? "bg-white text-[#241A14]" : "text-[#8A7B69]"
                }`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  previewMode === "mobile" ? "bg-white text-[#241A14]" : "text-[#8A7B69]"
                }`}
              >
                Mobile
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[#E3D0B8] bg-[#1a1510] p-3 shadow-lg">
            <div
              className={`mx-auto overflow-hidden rounded-2xl bg-white ${
                previewMode === "mobile" ? "max-w-[390px]" : "w-full"
              }`}
            >
              <div className="max-h-[75vh] overflow-y-auto">
                <WeddingTemplateSiteRenderer
                  template={{
                    ...template,
                    heroImage: previewContent.heroImageUrl || template.heroImage,
                    galleryImages: previewContent.galleryUrls,
                  }}
                  content={previewContent}
                  sections={sections}
                  themeOverrides={themeOverrides}
                  mode="preview"
                  embed
                  hideDemoBadge
                />
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#8A7B69]">
            שינוי צבע/טקסט/מדיה מתעדכן מיד ב-preview. שמירה כותבת ל-DB של Wedding Website בלבד.
          </p>
        </aside>
      </div>
    </div>
  );
}

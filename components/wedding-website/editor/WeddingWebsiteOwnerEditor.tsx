"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import {
  WW_FONT_OPTIONS,
  WW_VIDEOS,
  sanitizeGallery,
} from "@/config/weddingWebsite/media";
import { getDemoWeddingSiteContent } from "@/lib/weddingWebsite/resolveWeddingSiteContent";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import { WeddingSiteProvider } from "@/components/wedding-website/shared/WeddingSiteContext";
import type {
  WeddingSectionToggles,
  WeddingSiteContent,
  WeddingTemplateId,
  WeddingThemeOverrides,
} from "@/types/weddingWebsite";
import {
  ColorEditorPanel,
  ImagePickerPanel,
  InlineTextEditor,
  type WeddingEditApi,
  type WeddingEditSelection,
} from "./EditablePrimitives";
import "@/app/wedding-website/wedding-website.css";

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

type InspectorTab = "selection" | "colors" | "template" | "sections";

export default function WeddingWebsiteOwnerEditor({
  website,
  inviteMeta,
  invitationId,
  onSaved,
}: Props) {
  const [templateId, setTemplateId] = useState<WeddingTemplateId>(website.templateId);
  const [draftContent, setDraftContent] = useState<Partial<WeddingSiteContent>>(
    website.content || {}
  );
  const [sections, setSections] = useState<WeddingSectionToggles>(website.sections || {});
  const [themeOverrides, setThemeOverrides] = useState<WeddingThemeOverrides>(
    website.themeOverrides || {}
  );
  const [status, setStatus] = useState(website.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<WeddingEditSelection>(null);
  const [inspector, setInspector] = useState<InspectorTab>("selection");
  /** Full-bleed canvas by default — side panel is optional. */
  const [panelOpen, setPanelOpen] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [imageModalOpen, setImageModalOpen] = useState(false);

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

  const updateField = useCallback(
    <K extends keyof WeddingSiteContent>(key: K, value: WeddingSiteContent[K]) => {
      setDraftContent((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateTheme = useCallback(
    <K extends keyof WeddingThemeOverrides>(key: K, value: WeddingThemeOverrides[K]) => {
      setThemeOverrides((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const openImagePicker = useCallback(
    (field: "heroImageUrl" | "galleryUrls", index?: number) => {
      setSelected({ kind: "image", field, index });
      setImageModalOpen(true);
    },
    []
  );

  const editApi: WeddingEditApi = useMemo(
    () => ({
      enabled: true,
      selected,
      setSelected: (next) => {
        setSelected(next);
        if (next?.kind === "image") {
          setImageModalOpen(true);
        }
      },
      updateField,
      updateTheme,
      openImagePicker,
    }),
    [selected, updateField, updateTheme, openImagePicker]
  );

  useEffect(() => {
    const onUpload = async (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        dataUrl: string;
        field: "heroImageUrl" | "galleryUrls";
        index?: number;
        onDone: (url: string) => void;
        onFail: () => void;
      };
      try {
        const res = await fetch("/api/wedding-website/upload", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteId: website.id, base64Image: detail.dataUrl }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.url) {
          detail.onFail();
          setMessage(data.error || "העלאה נכשלה");
          return;
        }
        detail.onDone(String(data.url));
      } catch {
        detail.onFail();
        setMessage("שגיאה בהעלאת תמונה");
      }
    };
    window.addEventListener("ww-upload-image", onUpload as EventListener);
    return () => window.removeEventListener("ww-upload-image", onUpload as EventListener);
  }, [website.id]);

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
      setMessage("נשמר · השינוי חל רק על אתר החתונה");
    } finally {
      setSaving(false);
    }
  };

  const previewUrl =
    status === "published"
      ? `/w/${website.shareId}`
      : `/w/${website.shareId}?preview=1`;

  return (
    <WeddingSiteProvider
      content={previewContent}
      sections={sections}
      themeOverrides={themeOverrides}
      mode="edit"
      shareId={website.shareId}
      edit={editApi}
    >
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#1a1410] text-white" dir="rtl">
      {/* Top toolbar */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-[#241A14] px-3 py-2.5">
        <Link
          href={`/dashboard/invitations/${invitationId}/edit`}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white"
        >
          ← חזרה
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">עריכת אתר החתונה</p>
          <p className="truncate text-[11px] text-white/55">
            לחצו על טקסט להקלדה · על תמונה להחלפה · על סקשן לצבע · {inviteMeta.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-white/10 p-0.5 text-[11px] font-black">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`rounded-full px-3 py-1.5 ${device === "desktop" ? "bg-white text-[#241A14]" : "text-white/70"}`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`rounded-full px-3 py-1.5 ${device === "mobile" ? "bg-white text-[#241A14]" : "text-white/70"}`}
            >
              Mobile
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setInspector("colors");
              setPanelOpen(true);
            }}
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-black hover:bg-white/10"
          >
            צבעים
          </button>
          <button
            type="button"
            onClick={() => {
              setInspector("template");
              setPanelOpen(true);
            }}
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-black hover:bg-white/10"
          >
            תבנית
          </button>
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-black hover:bg-white/10"
          >
            {panelOpen ? "הסתר פאנל" : "הצג פאנל"}
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#D9B46F]/50 px-3 py-1.5 text-xs font-black text-[#F3D7A2]"
          >
            תצוגה
          </a>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ status: "draft" })}
            className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-black disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמירת טיוטה"}
          </button>
          {status === "published" ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save({ status: "draft" })}
              className="rounded-full border border-white/25 px-4 py-1.5 text-xs font-black"
            >
              בטל פרסום
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save({ status: "published" })}
              className="rounded-full bg-[#B8844F] px-4 py-1.5 text-xs font-black text-white"
            >
              פרסום
            </button>
          )}
        </div>
      </header>

      {message ? (
        <div className="shrink-0 bg-[#B8844F] px-4 py-2 text-center text-xs font-black text-white">
          {message}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Full-bleed live template canvas */}
        <div className="relative min-w-0 flex-1 overflow-auto bg-[#2a211c]">
          <div
            className={`mx-auto min-h-full ${
              device === "mobile" ? "max-w-[390px] py-4" : "w-full"
            }`}
          >
            <div
              className={`overflow-hidden bg-white ${
                device === "mobile" ? "rounded-[28px] shadow-2xl ring-8 ring-black/40" : ""
              }`}
            >
              <WeddingTemplateSiteRenderer
                template={{
                  ...template,
                  heroImage: previewContent.heroImageUrl || template.heroImage,
                  galleryImages:
                    previewContent.galleryUrls.length > 0
                      ? previewContent.galleryUrls
                      : template.galleryImages,
                }}
                content={previewContent}
                sections={sections}
                themeOverrides={themeOverrides}
                mode="edit"
                shareId={website.shareId}
                embed
                hideDemoBadge
                edit={editApi}
              />
            </div>
          </div>

          {imageModalOpen && selected?.kind === "image" ? (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
              onClick={() => setImageModalOpen(false)}
            >
              <div
                className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#FFFDF9] p-4 text-[#241A14] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <ImagePickerPanel
                  field={selected.field}
                  index={selected.index}
                  onClose={() => setImageModalOpen(false)}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Inspector */}
        {panelOpen ? (
          <aside className="flex w-full max-w-[360px] shrink-0 flex-col border-r border-white/10 bg-[#FFFDF9] text-[#241A14] shadow-2xl">
            <div className="flex gap-1 border-b border-[#EFE4D6] p-2">
              {(
                [
                  ["selection", "בחירה"],
                  ["colors", "צבעים"],
                  ["template", "תבנית"],
                  ["sections", "סקשנים"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInspector(id)}
                  className={`flex-1 rounded-full px-2 py-2 text-[11px] font-black ${
                    inspector === id
                      ? "bg-[#241A14] text-white"
                      : "bg-[#F4EEE4] text-[#8A7B69]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {inspector === "selection" ? (
                selected?.kind === "text" ? (
                  <InlineTextEditor
                    field={selected.field}
                    multiline
                    onClose={() => setSelected(null)}
                  />
                ) : selected?.kind === "image" ? (
                  <ImagePickerPanel
                    field={selected.field}
                    index={selected.index}
                    onClose={() => setSelected(null)}
                  />
                ) : (
                  <div className="space-y-3 text-sm font-semibold text-[#8A7B69]">
                    <p className="text-base font-black text-[#241A14]">איך לערוך?</p>
                    <p>1. לחצו על טקסט באתר — וערכו אותו כאן</p>
                    <p>2. לחצו על תמונה — והחליפו אותה</p>
                    <p>3. פתחו ״צבעים״ ושנו צבע — תראו מיד על האתר</p>
                    <p className="rounded-2xl border border-[#E7D0B0] bg-[#FFF9F1] p-3 text-xs">
                      מה שאתם רואים כאן הוא בדיוק התבנית החיה — לא תצוגה מדומה.
                    </p>
                  </div>
                )
              ) : null}

              {inspector === "colors" ? (
                <div className="space-y-4">
                  <ColorEditorPanel
                    themeOverrides={themeOverrides}
                    defaults={{
                      accent: template.theme.accent,
                      background: template.theme.bg,
                      text: template.theme.text,
                      button: template.theme.accent,
                    }}
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black text-[#8A7B69]">גופן</span>
                    <select
                      className="w-full rounded-xl border border-[#E7DED1] bg-white px-3 py-2.5 text-sm font-bold"
                      value={themeOverrides.fontFamily || ""}
                      onChange={(e) =>
                        updateTheme("fontFamily", e.target.value || undefined)
                      }
                    >
                      <option value="">ברירת מחדל של התבנית</option>
                      {WW_FONT_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {inspector === "template" ? (
                <div className="grid grid-cols-2 gap-2">
                  {WEDDING_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={`overflow-hidden rounded-2xl border text-right ${
                        templateId === t.id
                          ? "border-[#D9B46F] ring-2 ring-[#D9B46F]/40"
                          : "border-[#EFE4D6]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.previewImage}
                        alt={t.name}
                        className="h-20 w-full object-cover"
                      />
                      <p className="p-2 text-[11px] font-black">{t.name}</p>
                    </button>
                  ))}
                </div>
              ) : null}

              {inspector === "sections" ? (
                <div className="space-y-2">
                  {[
                    "countdown",
                    "invitation",
                    "our-story",
                    "how-we-met",
                    "proposal",
                    "gallery",
                    "schedule",
                    "location",
                    "dress-code",
                    "transportation",
                    "rsvp",
                    "faq",
                    "gifts",
                    "footer",
                  ].map((id) => {
                    const on = sections[id as keyof WeddingSectionToggles] !== false;
                    return (
                      <label
                        key={id}
                        className="flex items-center justify-between rounded-xl border border-[#EFE4D6] bg-white px-3 py-2.5 text-sm font-bold"
                      >
                        <span>{id}</span>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            setSections((prev) => ({
                              ...prev,
                              [id]: e.target.checked,
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="border-t border-[#EFE4D6] p-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save({ status })}
                className="w-full rounded-full bg-[#B8844F] py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? "שומר..." : "שמור שינויים"}
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
    </WeddingSiteProvider>
  );
}

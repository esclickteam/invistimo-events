"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import { hasWeddingWebsiteFeature } from "@/lib/features/entitlements";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import {
  WeddingSiteProvider,
  type WeddingSiteEditorApi,
  type WeddingSiteSelection,
} from "@/components/wedding-website/editable/WeddingSiteContext";
import EditorOverlay from "./EditorOverlay";
import EditorSidebar from "./EditorSidebar";
import { defaultSectionOrder, setByPath } from "@/lib/weddingWebsite/editorSchema";
import { applyMediaToContent, mediaSlotFromImageUrl } from "@/lib/weddingWebsite/media";
import type { WeddingGiftLinks } from "@/lib/weddingWebsite/gifts";
import { EMPTY_WEDDING_GIFTS } from "@/lib/weddingWebsite/gifts";
import type {
  WeddingDemoContent,
  WeddingMediaSlot,
  WeddingTemplateId,
  WeddingTextStyle,
} from "@/types/weddingWebsite";

const emptyContent: WeddingDemoContent = {
  coupleNames: "",
  coupleShort: "",
  weddingDate: "",
  weddingTime: "",
  venueName: "",
  venueAddress: "",
  heroSubtitle: "",
  invitationText: "",
  storyParagraphs: ["", "", ""],
  howWeMet: "",
  proposalStory: "",
  schedule: [{ time: "", title: "", description: "" }],
  dressCode: "",
  accommodations: [{ name: "", note: "" }],
  transportation: [{ title: "", description: "" }],
  faq: [{ question: "", answer: "" }],
  giftsNote: "",
  guestbookMessages: [],
  playlistNote: "",
  footerNote: "",
  guestMessageTitle: "השאירו לנו כמה מילים ❤️",
  guestMessageDescription: "נשמח לקרוא ברכה, איחול או הודעה מכם.",
  heroImage: "",
  media: {},
  styles: {},
  sectionStyles: {},
  copy: {},
  sections: {
    rsvp: true,
    transportation: true,
    guestbook: true,
    "guest-message": true,
    faq: true,
    "our-story": true,
    gallery: true,
  },
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function WeddingVisualEditor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [shareId, setShareId] = useState("");
  const [invitationId, setInvitationId] = useState("");
  const [invitationTitle, setInvitationTitle] = useState("");
  const [hasSite, setHasSite] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedSnapshot, setPublishedSnapshot] = useState("");
  const [templateId, setTemplateId] = useState<WeddingTemplateId>("eternal-gold");
  const [content, setContent] = useState<WeddingDemoContent>(emptyContent);
  const [gifts, setGifts] = useState<WeddingGiftLinks>(EMPTY_WEDDING_GIFTS);
  const [selection, setSelection] = useState<WeddingSiteSelection>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [sidebarTab, setSidebarTab] = useState<"sections" | "theme" | "settings">("sections");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const historyRef = useRef<WeddingDemoContent[]>([emptyContent]);
  const historyIndexRef = useRef(0);
  const skipHistoryRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const publicPath = shareId ? `/w/${shareId}` : "";
  const selectedTemplate = useMemo(
    () => WEDDING_TEMPLATES.find((template) => template.id === templateId),
    [templateId]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/wedding-website?draft=1", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        setEnabled(Boolean(data?.enabled || hasWeddingWebsiteFeature(data)));
        setShareId(data?.invitation?.shareId || "");
        setInvitationId(data?.invitation?._id || "");
        setInvitationTitle(data?.invitation?.title || "");
        if (data?.gifts) setGifts(data.gifts);
        const website = data?.weddingWebsite;
        const configured = Boolean(website?.hasSite);
        setHasSite(configured);
        setPickerOpen(!configured);
        if (website) {
          const stored = website.draftContent || website.content || {};
          const nextContent = {
            ...emptyContent,
            ...stored,
          } as WeddingDemoContent;
          if (!Array.isArray(nextContent.galleryImages) || nextContent.galleryImages.length === 0) {
            delete nextContent.galleryImages;
          }
          if (!nextContent.heroImage) {
            delete nextContent.heroImage;
          }
          setTemplateId(website.templateId);
          setPublished(website.published !== false);
          setContent(nextContent);
          historyRef.current = [nextContent];
          historyIndexRef.current = 0;
          setPublishedSnapshot(JSON.stringify(website.publishedContent || website.content || {}));
        }
      } catch (error) {
        console.error("Failed loading wedding website", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistDraft = useCallback(async (nextContent: WeddingDemoContent, nextTemplate = templateId) => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/wedding-website", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: true,
          templateId: nextTemplate,
          content: nextContent,
          invitationId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "SAVE_FAILED");
      setSaveState("saved");
      setDirty(false);
      if (data.publicPath) setShareId(String(data.publicPath).replace("/w/", ""));
    } catch (error) {
      console.error(error);
      setSaveState("error");
    }
  }, [invitationId, templateId]);

  const scheduleSave = useCallback(
    (nextContent: WeddingDemoContent, nextTemplate = templateId) => {
      setDirty(true);
      setSaveState("idle");
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        persistDraft(nextContent, nextTemplate);
      }, 1200);
    },
    [persistDraft, templateId]
  );

  const pushHistory = useCallback((next: WeddingDemoContent) => {
    if (skipHistoryRef.current) return;
    const list = historyRef.current.slice(0, historyIndexRef.current + 1);
    list.push(next);
    if (list.length > 50) list.shift();
    historyRef.current = list;
    historyIndexRef.current = list.length - 1;
  }, []);

  const updateContent = useCallback(
    (updater: (current: WeddingDemoContent) => WeddingDemoContent) => {
      setContent((current) => {
        const next = updater(current);
        pushHistory(next);
        scheduleSave(next);
        return next;
      });
    },
    [pushHistory, scheduleSave]
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    skipHistoryRef.current = true;
    const next = historyRef.current[historyIndexRef.current];
    setContent(next);
    scheduleSave(next);
    skipHistoryRef.current = false;
  }, [scheduleSave]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    skipHistoryRef.current = true;
    const next = historyRef.current[historyIndexRef.current];
    setContent(next);
    scheduleSave(next);
    skipHistoryRef.current = false;
  }, [scheduleSave]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && saveState !== "saving") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saveState]);

  const editorApi = useMemo<WeddingSiteEditorApi>(
    () => ({
      selection,
      setSelection,
      updateContent,
      updateText(path, value) {
        updateContent((current) => setByPath(current, path, value));
      },
      updateTextStyle(path, style) {
        updateContent((current) => {
          const styles = { ...(current.styles || {}) };
          if (!style || Object.keys(style).length === 0) delete styles[path];
          else styles[path] = { ...(styles[path] || {}), ...style };
          return { ...current, styles };
        });
      },
      updateMedia(slotId, slot) {
        updateContent((current) => applyMediaToContent(current, slotId, slot));
      },
      toggleSection(id, visible) {
        updateContent((current) => ({
          ...current,
          sections: { ...(current.sections || {}), [id]: visible },
        }));
      },
      moveSection(id, direction) {
        updateContent((current) => {
          const order = [...(current.sectionOrder?.length ? current.sectionOrder : defaultSectionOrder())];
          const index = order.indexOf(id as (typeof order)[number]);
          if (index < 0) return current;
          const nextIndex = index + direction;
          if (nextIndex < 0 || nextIndex >= order.length) return current;
          const [item] = order.splice(index, 1);
          order.splice(nextIndex, 0, item);
          return { ...current, sectionOrder: order };
        });
      },
      setSectionOrder(order) {
        updateContent((current) => ({ ...current, sectionOrder: order as WeddingDemoContent["sectionOrder"] }));
      },
      resetStyle(path) {
        updateContent((current) => {
          const styles = { ...(current.styles || {}) };
          delete styles[path];
          return { ...current, styles };
        });
      },
      async uploadMedia(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        if (invitationId) formData.append("invitationId", invitationId);
        const res = await fetch("/api/wedding-website/media", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.url) throw new Error(data?.error || "UPLOAD_FAILED");
        return {
          ...mediaSlotFromImageUrl(String(data.url)),
          type: data.resourceType === "video" ? "video" : mediaSlotFromImageUrl(String(data.url)).type,
        } as WeddingMediaSlot;
      },
    }),
    [invitationId, selection, updateContent]
  );

  async function publish() {
    setSaveState("saving");
    try {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      await persistDraft(contentRef.current);
      const res = await fetch("/api/wedding-website/publish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "PUBLISH_FAILED");
      setPublished(true);
      setPublishedSnapshot(JSON.stringify(contentRef.current));
      setSaveState("saved");
    } catch (error) {
      console.error(error);
      setSaveState("error");
    }
  }

  async function useTemplate(id: WeddingTemplateId) {
    setTemplateId(id);
    setHasSite(true);
    setPickerOpen(false);
    setPublished(false);
    scheduleSave(contentRef.current, id);
    await persistDraft(contentRef.current, id);
  }

  if (loading) {
    return <div dir="rtl" className="px-4 py-16 text-center text-sm font-bold text-[#8A7B69]">טוען אתר חתונה...</div>;
  }

  if (!enabled && !hasWeddingWebsiteFeature(user)) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[32px] border border-[#E7DED1] bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-black text-[#B8844F]">אתר חתונה אישי</p>
          <h1 className="mt-3 text-3xl font-black text-[#241A14]">האתר לא פתוח ללקוח הזה</h1>
          <Link href="/wedding-website" className="mt-6 inline-flex rounded-2xl bg-[#B8844F] px-5 py-3 text-sm font-black text-white">
            לצפייה בתבניות
          </Link>
        </div>
      </div>
    );
  }

  if (pickerOpen || !hasSite) {
    return (
      <div dir="rtl" className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs font-black text-[#B8844F]">בחירת תבנית</p>
        <h1 className="mt-2 text-3xl font-black text-[#241A14]">בחרו תבנית לאתר החתונה</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-[#8A7B69]">
          אפשר להחליף תבנית בכל רגע. התוכן שכבר ערכתם נשמר.
        </p>
        {hasSite ? (
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="mt-4 rounded-xl border border-[#E7DED1] bg-white px-4 py-2 text-sm font-black text-[#241A14]"
          >
            חזרה לעורך
          </button>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {WEDDING_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => useTemplate(template.id)}
              className={`overflow-hidden rounded-[24px] border bg-white text-right shadow-sm ${
                template.id === templateId ? "border-[#B8844F] ring-2 ring-[#B8844F]/30" : "border-[#EFE4D6]"
              }`}
            >
              <img src={template.previewImage} alt={template.name} className="h-40 w-full object-cover" />
              <div className="p-4">
                <p className="text-sm font-black text-[#241A14]">{template.name}</p>
                <p className="mt-1 text-xs font-semibold text-[#8A7B69]">{template.tagline}</p>
                <span className="mt-3 inline-flex rounded-xl bg-[#B8844F] px-3 py-2 text-xs font-black text-white">
                  {template.id === templateId ? "תבנית נוכחית" : "השתמשו בתבנית"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const saveLabel =
    saveState === "saving" ? "שומר..." : saveState === "saved" ? "נשמר" : saveState === "error" ? "שגיאה בשמירה" : dirty ? "שינויים לא שמורים" : "נשמר";

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-30 flex bg-[#120e0b]" dir="rtl">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-white" data-ww-chrome="1">
          <div>
            <p className="text-[10px] font-black text-[#E8D5A8]">עורך ויזואלי</p>
            <h1 className="text-sm font-black">{invitationTitle || "אתר החתונה"}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-white/60">{saveLabel}</span>
            <button type="button" onClick={undo} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-black">
              Undo
            </button>
            <button type="button" onClick={redo} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-black">
              Redo
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs font-black"
            >
              החלפת תבנית
            </button>
            <div className="rounded-full bg-white/10 p-1 text-[11px] font-black">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`rounded-full px-3 py-1 ${previewMode === "desktop" ? "bg-white text-black" : ""}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`rounded-full px-3 py-1 ${previewMode === "mobile" ? "bg-white text-black" : ""}`}
              >
                Mobile
              </button>
            </div>
            {publicPath ? (
              <a href={publicPath} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-1 text-xs font-black">
                אתר חי
              </a>
            ) : null}
            <button type="button" onClick={publish} className="rounded-lg bg-[#C9A962] px-3 py-1.5 text-xs font-black text-[#1a1410]">
              Publish
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {selectedTemplate ? (
            <WeddingSiteProvider
              mode="editor"
              template={selectedTemplate}
              content={content}
              editor={editorApi}
              live={{
                shareId,
                invitationId,
                role: "couple",
                gifts,
              }}
            >
              <div className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#2a2118] p-4">
                <div
                  className={`ww-editor-canvas mx-auto overflow-x-hidden bg-white shadow-2xl ${
                    previewMode === "mobile" ? "w-[390px] max-w-full" : "w-full max-w-6xl"
                  }`}
                >
                  <WeddingTemplateSiteRenderer
                    template={selectedTemplate}
                    content={content}
                    live
                    embed
                  />
                </div>
              </div>
              <EditorOverlay />
              <EditorSidebar
                tab={sidebarTab}
                onTab={setSidebarTab}
                content={content}
                publicPath={publicPath}
                published={published}
                hasUnpublishedChanges={JSON.stringify(content) !== publishedSnapshot}
                onPublish={publish}
                onChangeTemplate={() => setPickerOpen(true)}
              />
            </WeddingSiteProvider>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import { hasWeddingWebsiteFeature } from "@/lib/features/entitlements";
import WeddingTemplateSiteRenderer from "@/components/wedding-website/WeddingTemplateSiteRenderer";
import {
  WeddingSiteProvider,
  type WeddingEditorDevice,
  type WeddingSiteEditorApi,
  type WeddingSiteSelection,
} from "@/components/wedding-website/editable/WeddingSiteContext";
import EditorOverlay from "./EditorOverlay";
import EditorSidebar, { type SidebarTab } from "./EditorSidebar";
import EditorTopBar, { type EditorZoom, type SaveState } from "./EditorTopBar";
import {
  ConfirmDialog,
  HistoryDialog,
  MediaLibraryDialog,
  PublishDialog,
  TemplateGalleryDialog,
  type ConfirmRequest,
  type HistoryEntry,
} from "./EditorDialogs";
import { defaultSectionOrder, setByPath } from "@/lib/weddingWebsite/editorSchema";
import { editorSectionLabel, moveInOrder, resolveSectionOrder } from "@/lib/weddingWebsite/editorSections";
import { countContentChanges } from "@/lib/weddingWebsite/editorDiff";
import { collectEditorWarnings } from "@/lib/weddingWebsite/editorWarnings";
import { sanitizeWeddingThemeOverride } from "@/lib/weddingWebsite/editorTheme";
import { applyMediaToContent, mediaSlotFromImageUrl } from "@/lib/weddingWebsite/media";
import type { WeddingGiftLinks } from "@/lib/weddingWebsite/gifts";
import { EMPTY_WEDDING_GIFTS } from "@/lib/weddingWebsite/gifts";
import type {
  WeddingDemoContent,
  WeddingMediaSlot,
  WeddingTemplateId,
  WeddingThemeOverrides,
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
  mobileStyles: {},
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

/** Nominal desktop width so the canvas keeps real desktop breakpoints. */
const DESKTOP_CANVAS_WIDTH = 1280;
const MOBILE_CANVAS_WIDTH = 390;
const AUTOSAVE_DELAY_MS = 1200;
const MAX_HISTORY = 60;

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
  const [publishedContent, setPublishedContent] = useState<WeddingDemoContent | null>(null);
  const [templateId, setTemplateId] = useState<WeddingTemplateId>("eternal-gold");
  const [content, setContent] = useState<WeddingDemoContent>(emptyContent);
  const [gifts, setGifts] = useState<WeddingGiftLinks>(EMPTY_WEDDING_GIFTS);
  const [selection, setSelection] = useState<WeddingSiteSelection>(null);
  const [device, setDevice] = useState<WeddingEditorDevice>("desktop");
  // Fit by default: the canvas keeps real desktop breakpoints and is scaled to
  // the available width rather than being squeezed into a narrower layout.
  const [zoom, setZoom] = useState<EditorZoom>("fit");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("sections");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [librarySlot, setLibrarySlot] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: 0, label: "פתיחת העורך", at: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyContentRef = useRef<WeddingDemoContent[]>([emptyContent]);
  const historyIdRef = useRef(1);
  const skipHistoryRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState(DESKTOP_CANVAS_WIDTH);
  const [chromeHeight, setChromeHeight] = useState(64);
  const contentRef = useRef(content);
  contentRef.current = content;

  const publicPath = shareId ? `/w/${shareId}` : "";
  const selectedTemplate = useMemo(
    () => WEDDING_TEMPLATES.find((template) => template.id === templateId),
    [templateId]
  );
  const warnings = useMemo(
    () => collectEditorWarnings(content, selectedTemplate),
    [content, selectedTemplate]
  );
  const unpublishedCount = useMemo(
    () => countContentChanges(content, publishedContent),
    [content, publishedContent]
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
          const nextContent = { ...emptyContent, ...stored } as WeddingDemoContent;
          if (!Array.isArray(nextContent.galleryImages) || nextContent.galleryImages.length === 0) {
            delete nextContent.galleryImages;
          }
          if (!nextContent.heroImage) {
            delete nextContent.heroImage;
          }
          setTemplateId(website.templateId);
          setPublished(website.published !== false);
          setContent(nextContent);
          historyContentRef.current = [nextContent];
          setHistory([{ id: 0, label: "פתיחת העורך", at: Date.now() }]);
          setHistoryIndex(0);
          setPublishedContent((website.publishedContent || website.content || null) as WeddingDemoContent | null);
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

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setPaneWidth(width);
    });
    observer.observe(pane);
    return () => observer.disconnect();
  }, [loading, pickerOpen]);

  // The dashboard header is not a fixed height, so measure it instead of
  // guessing: a wrong guess either overlaps the editor or leaves a dead strip.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header:not([data-ww-chrome])");
    if (!header) return;
    function measure() {
      setChromeHeight(Math.round(header!.getBoundingClientRect().height));
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [loading, pickerOpen]);

  const persistDraft = useCallback(
    async (nextContent: WeddingDemoContent, nextTemplate = templateId) => {
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
    },
    [invitationId, templateId]
  );

  const scheduleSave = useCallback(
    (nextContent: WeddingDemoContent, nextTemplate = templateId) => {
      setDirty(true);
      setSaveState("idle");
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      // Debounced so typing never turns into a network write per keystroke.
      saveTimerRef.current = window.setTimeout(() => {
        persistDraft(nextContent, nextTemplate);
      }, AUTOSAVE_DELAY_MS);
    },
    [persistDraft, templateId]
  );

  const pushHistory = useCallback((next: WeddingDemoContent, label: string) => {
    if (skipHistoryRef.current) return;
    setHistoryIndex((currentIndex) => {
      const contents = historyContentRef.current.slice(0, currentIndex + 1);
      contents.push(next);
      let dropped = 0;
      while (contents.length > MAX_HISTORY) {
        contents.shift();
        dropped += 1;
      }
      historyContentRef.current = contents;

      setHistory((entries) => {
        const list = entries.slice(0, currentIndex + 1);
        list.push({ id: historyIdRef.current++, label, at: Date.now() });
        return list.slice(dropped);
      });

      return contents.length - 1;
    });
  }, []);

  const updateContent = useCallback(
    (updater: (current: WeddingDemoContent) => WeddingDemoContent, label = "עריכה") => {
      setContent((current) => {
        const next = updater(current);
        pushHistory(next, label);
        scheduleSave(next);
        return next;
      });
    },
    [pushHistory, scheduleSave]
  );

  const jumpToHistory = useCallback(
    (index: number) => {
      const next = historyContentRef.current[index];
      if (!next) return;
      skipHistoryRef.current = true;
      setHistoryIndex(index);
      setContent(next);
      scheduleSave(next);
      skipHistoryRef.current = false;
    },
    [scheduleSave]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    jumpToHistory(historyIndex - 1);
  }, [historyIndex, jumpToHistory]);

  const redo = useCallback(() => {
    if (historyIndex >= historyContentRef.current.length - 1) return;
    jumpToHistory(historyIndex + 1);
  }, [historyIndex, jumpToHistory]);

  const saveNow = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    persistDraft(contentRef.current);
  }, [persistDraft]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelection(null);
        (document.activeElement as HTMLElement | null)?.blur?.();
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (key === "y") {
        event.preventDefault();
        redo();
      }
      if (key === "s") {
        event.preventDefault();
        saveNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, saveNow, undo]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && saveState !== "saving") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saveState]);

  const scrollToSection = useCallback((id: string) => {
    setSelection({ type: "section", path: id, label: editorSectionLabel(id) });
    setActiveSectionId(id);
    const canvas = document.querySelector(".ww-editor-canvas");
    canvas?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // Selecting anything inside the canvas keeps the sidebar list in sync.
  useEffect(() => {
    if (selection?.type === "section" || selection?.type === "countdown") {
      setActiveSectionId(selection.path);
      return;
    }
    if (!selection) return;
    const canvas = document.querySelector(".ww-editor-canvas");
    const element = canvas?.querySelector(`[data-ww-path="${selection.path.replace(/"/g, "")}"]`);
    const sectionId = element?.closest("[data-ww-section]")?.getAttribute("data-ww-section");
    if (sectionId) setActiveSectionId(sectionId);
  }, [selection]);

  const editorApi = useMemo<WeddingSiteEditorApi>(
    () => ({
      selection,
      setSelection,
      device,
      updateContent,
      updateText(path, value) {
        updateContent((current) => setByPath(current, path, value), "עריכת טקסט");
      },
      updateTextStyle(path, style) {
        updateContent((current) => {
          const styles = { ...(current.styles || {}) };
          if (!style || Object.keys(style).length === 0) delete styles[path];
          else styles[path] = { ...(styles[path] || {}), ...style };
          return { ...current, styles };
        }, "עיצוב טקסט");
      },
      updateMedia(slotId, slot) {
        updateContent(
          (current) => applyMediaToContent(current, slotId, slot),
          slot ? "החלפת מדיה" : "הסרת מדיה"
        );
      },
      toggleSection(id, visible) {
        updateContent(
          (current) => ({
            ...current,
            sections: { ...(current.sections || {}), [id]: visible },
          }),
          `${visible ? "הצגת" : "הסתרת"} מקטע ${editorSectionLabel(id)}`
        );
      },
      moveSection(id, direction) {
        updateContent((current) => {
          const order = resolveSectionOrder(current);
          const index = order.indexOf(id as (typeof order)[number]);
          if (index < 0) return current;
          return { ...current, sectionOrder: moveInOrder(order, index, index + direction) };
        }, "שינוי סדר מקטעים");
      },
      setSectionOrder(order) {
        updateContent(
          (current) => ({ ...current, sectionOrder: order as WeddingDemoContent["sectionOrder"] }),
          "שינוי סדר מקטעים"
        );
      },
      updateSectionStyle(id, patch) {
        updateContent((current) => {
          const sectionStyles = { ...(current.sectionStyles || {}) };
          if (!patch) delete sectionStyles[id];
          else sectionStyles[id] = { ...(sectionStyles[id] || {}), ...patch };
          return { ...current, sectionStyles };
        }, `עיצוב מקטע ${editorSectionLabel(id)}`);
      },
      updateTheme(patch) {
        updateContent((current) => {
          if (!patch) {
            const next = { ...current };
            delete next.theme;
            return next;
          }
          const merged: WeddingThemeOverrides = {
            ...(current.theme || {}),
            ...patch,
            colors: { ...(current.theme?.colors || {}), ...(patch.colors || {}) },
          };
          for (const [role, value] of Object.entries(merged.colors || {})) {
            if (!value) delete (merged.colors as Record<string, string | undefined>)[role];
          }
          if (!merged.headingFont) delete merged.headingFont;
          if (!merged.bodyFont) delete merged.bodyFont;
          return { ...current, theme: sanitizeWeddingThemeOverride(merged) };
        }, "עיצוב גלובלי");
      },
      resetStyle(path) {
        updateContent((current) => {
          const styles = { ...(current.styles || {}) };
          const mobileStyles = { ...(current.mobileStyles || {}) };
          delete styles[path];
          delete mobileStyles[path];
          return { ...current, styles, mobileStyles };
        }, "איפוס עיצוב טקסט");
      },
      resetSection(id) {
        updateContent((current) => {
          const sectionStyles = { ...(current.sectionStyles || {}) };
          delete sectionStyles[id];
          const styles = { ...(current.styles || {}) };
          const mobileStyles = { ...(current.mobileStyles || {}) };
          for (const key of Object.keys(styles)) {
            if (key === `copy.${id}`) delete styles[key];
          }
          for (const key of Object.keys(mobileStyles)) {
            if (key === `copy.${id}`) delete mobileStyles[key];
          }
          return { ...current, sectionStyles, styles, mobileStyles };
        }, `איפוס מקטע ${editorSectionLabel(id)}`);
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
      pickFromLibrary(slotId) {
        setLibrarySlot(slotId);
        setLibraryOpen(true);
      },
      scrollToSection,
      confirm(request) {
        setConfirmRequest(request);
      },
    }),
    [device, invitationId, scrollToSection, selection, updateContent]
  );

  async function publish() {
    setPublishing(true);
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
      setPublishedContent(contentRef.current);
      setSaveState("saved");
      setPublishDialogOpen(false);
    } catch (error) {
      console.error(error);
      setSaveState("error");
    } finally {
      setPublishing(false);
    }
  }

  async function useTemplate(id: WeddingTemplateId) {
    setTemplateId(id);
    setHasSite(true);
    setPickerOpen(false);
    setTemplateDialogOpen(false);
    setPublished(false);
    scheduleSave(contentRef.current, id);
    await persistDraft(contentRef.current, id);
  }

  if (loading) {
    return (
      <div dir="rtl" className="px-4 py-16 text-center text-sm font-bold text-[#8A7B69]">
        טוען את אתר החתונה...
      </div>
    );
  }

  if (!enabled && !hasWeddingWebsiteFeature(user)) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[32px] border border-[#E7DED1] bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-black text-[#B8844F]">אתר חתונה אישי</p>
          <h1 className="mt-3 text-3xl font-black text-[#241A14]">האתר לא פתוח ללקוח הזה</h1>
          <Link
            href="/wedding-website"
            className="mt-6 inline-flex rounded-2xl bg-[#B8844F] px-5 py-3 text-sm font-black text-white"
          >
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
          אפשר להחליף תבנית בכל רגע דרך לשונית העיצוב. התוכן שכבר ערכתם נשמר.
        </p>
        {hasSite ? (
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="mt-4 min-h-[42px] rounded-xl border border-[#E7DED1] bg-white px-4 text-sm font-black text-[#241A14]"
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
              className={`overflow-hidden rounded-[24px] border bg-white text-right shadow-sm transition hover:border-[#B8844F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8844F] ${
                template.id === templateId ? "border-[#B8844F] ring-2 ring-[#B8844F]/30" : "border-[#EFE4D6]"
              }`}
            >
              <img src={template.previewImage} alt="" className="h-40 w-full object-cover" />
              <div className="p-4">
                <p className="text-sm font-black text-[#241A14]">{template.name}</p>
                <p className="mt-1 text-xs font-semibold text-[#8A7B69]">{template.tagline}</p>
                <span className="mt-3 inline-flex rounded-xl bg-[#B8844F] px-3 py-2 text-xs font-black text-white">
                  {template.id === templateId ? "תבנית נוכחית" : "בחירת התבנית"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const canvasWidth = device === "mobile" ? MOBILE_CANVAS_WIDTH : DESKTOP_CANVAS_WIDTH;
  const canvasZoom =
    zoom === "fit"
      ? Math.min(1, Math.max(0.35, (paneWidth - 48) / canvasWidth))
      : (zoom as number);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col bg-[#100d0b]"
      style={{ top: chromeHeight }}
      dir="rtl"
    >
      <EditorTopBar
        siteTitle={invitationTitle}
        device={device}
        onDevice={setDevice}
        zoom={zoom}
        onZoom={setZoom}
        saveState={saveState}
        dirty={dirty}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < historyContentRef.current.length - 1}
        onUndo={undo}
        onRedo={redo}
        onHistory={() => setHistoryDialogOpen(true)}
        onPreview={() => window.open("/dashboard/wedding-website/preview", "_blank")}
        livePath={published ? publicPath : ""}
        unpublishedCount={unpublishedCount}
        onPublish={() => setPublishDialogOpen(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
      />

      <div className="flex min-h-0 flex-1">
        {selectedTemplate ? (
          <WeddingSiteProvider
            mode="editor"
            template={selectedTemplate}
            content={content}
            editor={editorApi}
            live={{ shareId, invitationId, role: "couple", gifts }}
          >
            <div
              ref={paneRef}
              className="ww-editor-scroll relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#1c1815] p-6"
            >
              <div
                className={`ww-editor-canvas mx-auto bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${
                  device === "mobile" ? "rounded-[28px] ring-8 ring-black/40" : "rounded-lg"
                }`}
                style={{ width: canvasWidth, maxWidth: "100%", zoom: canvasZoom }}
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
              open={sidebarOpen}
              onToggle={() => setSidebarOpen((current) => !current)}
              warnings={warnings}
              templateName={selectedTemplate.name}
              publicPath={published ? publicPath : ""}
              onChangeTemplate={() => setTemplateDialogOpen(true)}
              onOpenMediaLibrary={() => {
                setLibrarySlot(null);
                setLibraryOpen(true);
              }}
              activeSectionId={activeSectionId}
              onSelectSection={scrollToSection}
            />
          </WeddingSiteProvider>
        ) : null}
      </div>

      {templateDialogOpen ? (
        <TemplateGalleryDialog
          currentId={templateId}
          onApply={useTemplate}
          onClose={() => setTemplateDialogOpen(false)}
        />
      ) : null}

      {publishDialogOpen ? (
        <PublishDialog
          changeCount={unpublishedCount}
          publicPath={publicPath}
          publishing={publishing}
          onPublish={publish}
          onClose={() => setPublishDialogOpen(false)}
        />
      ) : null}

      {historyDialogOpen ? (
        <HistoryDialog
          entries={history}
          activeIndex={historyIndex}
          onJump={jumpToHistory}
          onClose={() => setHistoryDialogOpen(false)}
        />
      ) : null}

      {libraryOpen ? (
        <MediaLibraryDialog
          invitationId={invitationId}
          onPick={
            librarySlot
              ? (slot) => {
                  editorApi.updateMedia(librarySlot, slot);
                  setLibraryOpen(false);
                }
              : null
          }
          onClose={() => setLibraryOpen(false)}
        />
      ) : null}

      {confirmRequest ? (
        <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
      ) : null}
    </div>
  );
}

export { defaultSectionOrder };

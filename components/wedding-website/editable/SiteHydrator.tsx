"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import {
  BUSINESS_LOGIC_SKIP,
  buildTextIndex,
  defaultSectionOrder,
  getByPath,
  isSectionVisible,
  LOCKED_EVENT_PATHS,
  matchTextField,
  sectionTitleFields,
} from "@/lib/weddingWebsite/editorSchema";
import { buildWeddingThemeCss } from "@/lib/weddingWebsite/editorTheme";
import {
  buildMobileCss,
  buildSectionStyleCss,
  buildTextStyleCss,
} from "@/lib/weddingWebsite/siteCss";
import { collectUsedWeddingFonts, loadWeddingFont } from "@/lib/weddingWebsite/fonts";
import {
  htmlToPlainTextWithBreaks,
  isActivelyEditingText,
  textHasBreaks,
} from "@/lib/weddingWebsite/textEditing";
import type { WeddingDemoContent } from "@/types/weddingWebsite";
import { useWeddingSite } from "./WeddingSiteContext";
import {
  mediaElementStyle,
  optimizedMediaUrl,
  resolveMediaSlot,
  SECTION_BACKGROUND_MEDIA_IDS,
} from "@/lib/weddingWebsite/media";

const SKIP = `${BUSINESS_LOGIC_SKIP},.ww-editor-ui,[data-ww-chrome]`;

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export function WeddingSiteRuntimeStyles() {
  const site = useWeddingSite();
  if (!site) return null;

  const { content, mode } = site;
  const order = content.sectionOrder?.length
    ? content.sectionOrder
    : defaultSectionOrder();
  const themeCss = buildWeddingThemeCss(site.template, content.theme);
  const mobileCss = buildMobileCss(content);

  return (
    <style data-ww-runtime="1">{`
      .wedding-website-root {
        display: flex;
        flex-direction: column;
        overflow-x: clip;
        overflow-y: visible;
        max-width: 100%;
      }
      .wedding-website-root img,
      .wedding-website-root video,
      .wedding-website-root iframe {
        max-width: 100%;
      }
      ${order
        .map((id, index) => `#${cssEscape(String(id))}{order:${index + 2};}`)
        .join("")}
      nav, header { order: 0; }
      ${WEDDING_SECTIONS.map((section) => {
        if (isSectionVisible(content, section.id)) return "";
        return `#${section.id}{display:none!important}`;
      }).join("")}
      ${!isSectionVisible(content, "guestbook") ? `#guestbook{display:none!important}` : ""}
      ${themeCss}
      ${buildSectionStyleCss(content)}
      ${buildTextStyleCss(content.styles)}
      ${mobileCss ? `@media (max-width: 767px){${mobileCss}}` : ""}
      ${mode === "editor" && mobileCss ? `@container (max-width: 700px){${mobileCss}}` : ""}
      ${mode === "editor"
        ? `
        .ww-editor-canvas { overflow-anchor: none; overflow-x: clip; overflow-y: visible; container-type: inline-size; }
        .ww-editor-canvas .ww-site,
        .ww-editor-canvas .wedding-website-root { max-width: 100%; overflow-x: clip; overflow-y: visible; scroll-behavior: auto; }
        .ww-editor-canvas .w-screen { width: 100% !important; max-width: 100% !important; }
        .ww-editor-canvas img, .ww-editor-canvas video, .ww-editor-canvas iframe { max-width: 100%; }
        .ww-editor-canvas .ww-nav-desktop { display: none !important; }
        .ww-editor-canvas .ww-nav-hamburger { display: flex !important; }
        @container (max-width: 700px) {
          .ww-editor-canvas [class*="md:grid-cols-2"],
          .ww-editor-canvas [class*="lg:grid-cols-2"],
          .ww-editor-canvas [class*="md:grid-cols-5"],
          .ww-editor-canvas [class*="lg:grid-cols-12"] { grid-template-columns: 1fr !important; }
          .ww-editor-canvas [class*="md:grid-cols-4"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .ww-editor-canvas [data-ww-countdown="units"] {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            justify-items: center;
          }
          .ww-editor-canvas .ww-desktop-fx { display: none !important; }
          .ww-editor-canvas h1 { font-size: clamp(1.75rem, 9cqi, 3.25rem) !important; line-height: 1.15 !important; }
        }
        @container (min-width: 700px) {
          .ww-editor-canvas .ww-nav-desktop { display: flex !important; }
          .ww-editor-canvas .ww-nav-hamburger,
          .ww-editor-canvas .ww-nav-hamburger-panel { display: none !important; }
        }
        [data-ww-edit]{cursor:pointer}
        [data-ww-edit="text"]{
          cursor:text;
          white-space:pre-wrap;
          user-select:text;
          -webkit-user-select:text;
          outline:none!important;
          box-shadow:none!important;
          caret-color:currentColor;
        }
        [data-ww-edit="text"][contenteditable="true"]{outline:none!important;box-shadow:none!important;cursor:text}
        .ww-site img[data-ww-edit], .ww-site video[data-ww-edit]{cursor:pointer}
        .ww-edit-text{display:inline}
        [data-ww-section]{position:relative}
        .ww-section-handle{
          position:absolute;
          top:8px;
          right:8px;
          z-index:30;
          border:0;
          border-radius:999px;
          background:#18120e;
          color:#fff;
          font-size:10px;
          font-weight:900;
          padding:4px 10px;
          cursor:pointer;
          opacity:0;
          transition:opacity .15s ease;
        }
        [data-ww-section]:hover > .ww-section-handle,
        .ww-section-handle:focus-visible{opacity:1}
        [data-ww-section][data-ww-active="1"]{outline:2px solid #C9A962;outline-offset:-2px}
        [data-ww-section][data-ww-active="1"] > .ww-section-handle{opacity:1}
      `
        : `
        [data-ww-path]{white-space:pre-wrap}
      `}
    `}</style>
  );
}

export function WeddingSiteHydrator({ children }: { children: ReactNode }) {
  const site = useWeddingSite();
  const content = site?.content;
  const mode = site?.mode;

  useLayoutEffect(() => {
    if (!content) return;
    const fonts = [
      ...collectUsedWeddingFonts(content.styles),
      ...collectUsedWeddingFonts(content.mobileStyles),
      ...collectUsedWeddingFonts({
        heading: { fontFamily: content.theme?.headingFont },
        body: { fontFamily: content.theme?.bodyFont },
      }),
    ];
    fonts.forEach((font) => loadWeddingFont(font.family));
    hydrateEditableNodes(content, mode === "editor");
  }, [content, mode]);

  return <>{children}</>;
}

export function hydrateEditableNodes(content: WeddingDemoContent, isEditor: boolean) {
  if (typeof document === "undefined") return;
  const root =
    document.querySelector(".ww-site") || document.querySelector(".wedding-website-root");
  if (!root) return;
  if (isActivelyEditingText(root)) return;

  root.querySelectorAll("iframe").forEach((frame) => {
    if (!frame.getAttribute("loading")) frame.setAttribute("loading", "lazy");
  });

  const index = buildTextIndex(content);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.textContent?.replace(/\s+/g, " ").trim() || "";
      if (!value) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.isContentEditable || parent.closest("[contenteditable='true']")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  for (const node of textNodes) {
    const parent = node.parentElement;
    if (!parent) continue;
    const matched = matchTextField(node.textContent || "", index);
    if (!matched) continue;

    const target = resolveTextTarget(node, parent, matched.path);
    if (!target) continue;

    applySavedText(target, content, matched.path);

    target.dataset.wwPath = matched.path;
    target.dataset.wwLabel = matched.label;
    if (isEditor) {
      target.dataset.wwEdit = "text";
      if (!LOCKED_EVENT_PATHS.has(matched.path)) {
        target.contentEditable = "true";
        target.spellcheck = true;
        target.style.whiteSpace = "pre-wrap";
        target.style.outline = "none";
        target.style.userSelect = "text";
      }
    } else {
      delete target.dataset.wwEdit;
      if (target.isContentEditable) target.contentEditable = "false";
    }
  }

  hydrateSectionTitles(root, content, isEditor);
  hydrateSectionBackgrounds(root, content);

  if (!isEditor) {
    root.querySelectorAll(".ww-section-handle").forEach((handle) => handle.remove());
    return;
  }

  root.querySelectorAll("section[id], [id].scroll-mt-24").forEach((section) => {
    const id = section.getAttribute("id");
    if (!id) return;
    if (section.closest(SKIP)) return;
    const edit = section.getAttribute("data-ww-edit");
    if (edit === "text" || edit === "media" || edit === "countdown") return;
    section.setAttribute("data-ww-section", id);
    if (edit === "section") {
      section.removeAttribute("data-ww-edit");
      section.removeAttribute("data-ww-path");
      section.removeAttribute("data-ww-label");
    }
    if (section.querySelector(":scope > .ww-section-handle")) return;
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "ww-section-handle";
    handle.dataset.wwEdit = "section";
    handle.dataset.wwPath = id;
    handle.dataset.wwLabel = "מקטע";
    handle.textContent = "מקטע";
    section.insertBefore(handle, section.firstChild);
  });
}

function hydrateSectionBackgrounds(root: Element, content: WeddingDemoContent) {
  for (const id of SECTION_BACKGROUND_MEDIA_IDS) {
    const section = root.querySelector(`#${cssEscape(id)}`);
    if (!(section instanceof HTMLElement)) continue;
    const existing = section.querySelector(":scope > .ww-section-bg") as HTMLElement | null;
    const slot = resolveMediaSlot(id, content);
    if (!slot?.src) {
      existing?.remove();
      continue;
    }

    const wrap = existing || document.createElement("div");
    wrap.className = "ww-section-bg";
    wrap.setAttribute("aria-hidden", "true");
    wrap.replaceChildren();

    const media = document.createElement(slot.type === "video" ? "video" : "img");
    const src = optimizedMediaUrl(slot, 1920) || slot.src;
    const style = mediaElementStyle(slot);
    Object.assign(media.style, {
      width: style.width,
      height: style.height,
      objectFit: style.objectFit,
      objectPosition: style.objectPosition,
      transform: style.transform || "",
    });
    if (slot.type === "video") {
      const video = media as HTMLVideoElement;
      video.src = src;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      if (slot.poster) video.poster = slot.poster;
      void video.play().catch(() => undefined);
    } else {
      (media as HTMLImageElement).src = src;
      (media as HTMLImageElement).alt = "";
    }
    wrap.appendChild(media);

    const overlay = content.sectionStyles?.[id]?.overlayOpacity;
    if (overlay && overlay > 0) {
      const veil = document.createElement("div");
      veil.style.cssText = `position:absolute;inset:0;background:#000;opacity:${Math.min(80, overlay) / 100}`;
      wrap.appendChild(veil);
    }

    if (!existing) section.insertBefore(wrap, section.firstChild);
  }
}

function hydrateSectionTitles(
  root: Element,
  content: WeddingDemoContent,
  isEditor: boolean
) {
  for (const field of sectionTitleFields()) {
    const section = root.querySelector(`#${cssEscape(field.sectionId)}`);
    if (!(section instanceof HTMLElement) || section.closest(SKIP)) continue;
    const heading = section.querySelector("h1, h2, h3");
    if (!(heading instanceof HTMLElement) || heading.closest(SKIP)) continue;
    const existingPath = heading.dataset.wwPath || "";
    if (existingPath && !existingPath.startsWith("copy.")) continue;

    heading.dataset.wwPath = field.path;
    heading.dataset.wwLabel = field.label;
    if (isEditor) {
      heading.dataset.wwEdit = "text";
      heading.contentEditable = "true";
      heading.spellcheck = true;
      heading.style.whiteSpace = "pre-wrap";
      heading.style.outline = "none";
      heading.style.userSelect = "text";
    } else {
      delete heading.dataset.wwEdit;
      if (heading.isContentEditable) heading.contentEditable = "false";
    }

    applySavedText(heading, content, field.path);
  }
}

function meaningfulChildNodes(el: HTMLElement) {
  return Array.from(el.childNodes).filter((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return true;
    return Boolean((node.textContent || "").trim());
  });
}

function resolveTextTarget(node: Text, parent: HTMLElement, path: string) {
  if (parent.dataset.wwPath === path) return parent;
  const meaningful = meaningfulChildNodes(parent);
  const onlyThisText =
    meaningful.length === 1 && (meaningful[0] === node || meaningful[0] === parent.firstElementChild);
  if (onlyThisText || parent.childNodes.length === 1) return parent;
  return wrapTextNode(node);
}

function wrapTextNode(node: Text) {
  if (!node.parentElement) return null;
  if (node.parentElement.dataset.wwPath) return node.parentElement;
  if (node.parentElement.classList.contains("ww-edit-text")) return node.parentElement;
  const span = document.createElement("span");
  span.className = "ww-edit-text";
  node.parentElement.insertBefore(span, node);
  span.appendChild(node);
  return span;
}

function applySavedText(target: HTMLElement, content: WeddingDemoContent, path: string) {
  if (LOCKED_EVENT_PATHS.has(path)) return;
  const savedRaw = getByPath(content, path);
  const saved = typeof savedRaw === "string" ? savedRaw : "";
  if (!saved) return;

  const current = htmlToPlainTextWithBreaks(target);
  if (current === saved) {
    if (textHasBreaks(saved)) target.style.whiteSpace = "pre-wrap";
    return;
  }

  const collapsedSaved = saved.replace(/\s+/g, " ").trim();
  const collapsedCurrent = current.replace(/\s+/g, " ").trim();
  if (collapsedSaved === collapsedCurrent && !textHasBreaks(saved)) return;

  target.innerText = saved;
  if (textHasBreaks(saved)) target.style.whiteSpace = "pre-wrap";
}

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
} from "@/lib/weddingWebsite/editorSchema";
import { textStyleToCss } from "@/lib/weddingWebsite/styles";
import { collectUsedWeddingFonts, loadWeddingFont } from "@/lib/weddingWebsite/fonts";
import {
  htmlToPlainTextWithBreaks,
  isActivelyEditingText,
  textHasBreaks,
} from "@/lib/weddingWebsite/textEditing";
import type { WeddingDemoContent } from "@/types/weddingWebsite";
import { useWeddingSite } from "./WeddingSiteContext";

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
  const fonts = collectUsedWeddingFonts(content.styles);

  return (
    <style data-ww-runtime="1">{`
      .wedding-website-root {
        display: flex;
        flex-direction: column;
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
      ${Object.entries(content.sectionStyles || {})
        .map(([id, style]) => {
          const rules: string[] = [];
          if (style.backgroundColor) rules.push(`background-color:${style.backgroundColor}`);
          if (style.paddingTop) rules.push(`padding-top:${style.paddingTop}`);
          if (style.paddingBottom) rules.push(`padding-bottom:${style.paddingBottom}`);
          return rules.length ? `#${cssEscape(id)}{${rules.join(";")}}` : "";
        })
        .join("")}
      ${Object.entries(content.styles || {})
        .map(([path, style]) => {
          const css = textStyleToCss(style);
          const rules = Object.entries(css)
            .filter(([, value]) => value !== undefined && value !== "")
            .map(([key, value]) => {
              const prop = key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
              return `${prop}:${value}`;
            });
          return rules.length
            ? `[data-ww-path="${cssEscape(path)}"]{${rules.join(";")}}`
            : "";
        })
        .join("")}
      ${mode === "editor"
        ? `
        .ww-editor-canvas { overflow-anchor: none; }
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
      `
        : `
        [data-ww-path]{white-space:pre-wrap}
      `}
      ${fonts.length ? "" : ""}
    `}</style>
  );
}

export function WeddingSiteHydrator({ children }: { children: ReactNode }) {
  const site = useWeddingSite();
  const content = site?.content;
  const mode = site?.mode;

  useLayoutEffect(() => {
    if (!content) return;
    const fonts = collectUsedWeddingFonts(content.styles);
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

  if (!isEditor) return;

  root.querySelectorAll("section[id], [id].scroll-mt-24").forEach((section) => {
    const id = section.getAttribute("id");
    if (!id) return;
    if (section.closest(SKIP)) return;
    if (section.getAttribute("data-ww-edit") === "text") return;
    if (section.getAttribute("data-ww-edit") === "media") return;
    section.setAttribute("data-ww-edit", "section");
    section.setAttribute("data-ww-path", id);
    section.setAttribute("data-ww-label", "מקטע");
  });
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

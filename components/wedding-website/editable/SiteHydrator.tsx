"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { WEDDING_SECTIONS } from "@/config/weddingWebsite/templates";
import {
  BUSINESS_LOGIC_SKIP,
  buildTextIndex,
  defaultSectionOrder,
  isSectionVisible,
  matchTextField,
} from "@/lib/weddingWebsite/editorSchema";
import { textStyleToCss } from "@/lib/weddingWebsite/styles";
import { collectUsedWeddingFonts, loadWeddingFont } from "@/lib/weddingWebsite/fonts";
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
        [data-ww-edit]{cursor:pointer}
        [data-ww-edit="text"]{cursor:text}
        .ww-site img[data-ww-edit], .ww-site video[data-ww-edit]{cursor:pointer}
      `
        : ""}
    `}</style>
  );
}

export function WeddingSiteHydrator({ children }: { children: ReactNode }) {
  const site = useWeddingSite();

  useLayoutEffect(() => {
    if (!site) return;
    const fonts = collectUsedWeddingFonts(site.content.styles);
    fonts.forEach((font) => loadWeddingFont(font.family));
    hydrateEditableNodes(site.content, site.mode === "editor");
  }, [site]);

  return <>{children}</>;
}

export function hydrateEditableNodes(content: WeddingDemoContent, isEditor: boolean) {
  if (typeof document === "undefined") return;
  const root = document.querySelector(".ww-site") || document.querySelector(".wedding-website-root");
  if (!root) return;

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

    const override =
      matched.path.startsWith("copy.")
        ? content.copy?.[matched.path.slice(5)] || content.copy?.[matched.path]
        : undefined;
    if (override && node.textContent?.trim() !== override) {
      node.textContent = override;
    }

    const target =
      parent.childNodes.length === 1 || parent.dataset.wwPath === matched.path
        ? parent
        : wrapTextNode(node);

    if (!target) continue;
    target.dataset.wwPath = matched.path;
    target.dataset.wwLabel = matched.label;
    if (isEditor) target.dataset.wwEdit = "text";
    else {
      delete target.dataset.wwEdit;
    }
  }

  if (!isEditor) return;

  root.querySelectorAll("section[id], [id].scroll-mt-24").forEach((section) => {
    const id = section.getAttribute("id");
    if (!id) return;
    if (section.closest(SKIP)) return;
    section.setAttribute("data-ww-edit", "section");
    section.setAttribute("data-ww-path", id);
    section.setAttribute("data-ww-label", "מקטע");
  });
}

function wrapTextNode(node: Text) {
  if (!node.parentElement) return null;
  if (node.parentElement.dataset.wwPath) return node.parentElement;
  const span = document.createElement("span");
  span.className = "ww-edit-text";
  node.parentElement.insertBefore(span, node);
  span.appendChild(node);
  return span;
}

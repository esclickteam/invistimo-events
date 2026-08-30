"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import type { WeddingSiteSelection } from "@/components/wedding-website/editable/WeddingSiteContext";
import { LOCKED_EVENT_PATHS } from "@/lib/weddingWebsite/editorSchema";
import { htmlToPlainTextWithBreaks } from "@/lib/weddingWebsite/textEditing";
import EditorSelectionToolbar from "./EditorSelectionToolbar";

const SKIP = "[data-ww-chrome],.ww-editor-ui,input,textarea,select,[data-rsvp-core]";
const INNER_EDIT = '[data-ww-edit="text"],[data-ww-edit="media"],[data-ww-edit="countdown"],[data-ww-edit="gallery"]';

type HoverState = {
  type: string;
  path: string;
  label: string;
  el: HTMLElement;
};

export default function EditorOverlay() {
  const site = useWeddingSite();
  const editor = site?.editor;
  const [hover, setHover] = useState<HoverState | null>(null);
  const [toolbarRect, setToolbarRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);
  const persistTimer = useRef<number | null>(null);
  const selectedElRef = useRef<HTMLElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = document.querySelector(".ww-editor-canvas") as HTMLElement | null;
    if (!canvas || !editor) return;
    const api = editor;

    function fromTarget(target: EventTarget | null): HoverState | null {
      const el = target instanceof Element ? target : null;
      if (!el) return null;
      if (el.closest(SKIP)) return null;
      const preferred = el.closest(INNER_EDIT) as HTMLElement | null;
      const hit = (preferred || el.closest("[data-ww-edit]")) as HTMLElement | null;
      if (!hit) return null;
      const type = hit.dataset.wwEdit || "";
      const path = hit.dataset.wwPath || "";
      if (!type || !path) return null;
      return {
        type,
        path,
        label: hit.dataset.wwLabel || labelFor(type),
        el: hit,
      };
    }

    function persistText(el: HTMLElement) {
      const path = el.dataset.wwPath || "";
      if (!path || LOCKED_EVENT_PATHS.has(path)) return;
      api.updateText(path, htmlToPlainTextWithBreaks(el));
    }

    function onPointerMove(event: PointerEvent) {
      const next = fromTarget(event.target);
      // Only re-render when the hovered element actually changes, otherwise
      // every mouse move would repaint the canvas.
      setHover((current) =>
        current?.el === next?.el && current?.path === next?.path ? current : next
      );
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      const next = fromTarget(event.target);
      if (!next) {
        selectedElRef.current = null;
        api.setSelection(null);
        return;
      }

      selectedElRef.current = next.el;
      api.setSelection(toSelection(next));

      if (next.type === "text") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      const el = event.target instanceof HTMLElement ? event.target : null;
      if (!el?.isContentEditable) return;
      if (!el.closest("[data-ww-edit='text']")) return;
      event.preventDefault();
      if (!document.execCommand("insertLineBreak")) {
        insertLineBreakAtCaret();
      }
    }

    function onFocusOut(event: FocusEvent) {
      const el =
        event.target instanceof HTMLElement
          ? (event.target.closest("[data-ww-edit='text']") as HTMLElement | null)
          : null;
      if (!el) return;
      persistText(el);
    }

    function onInput(event: Event) {
      const el =
        event.target instanceof HTMLElement
          ? (event.target.closest("[data-ww-edit='text']") as HTMLElement | null)
          : null;
      if (!el) return;
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => persistText(el), 400);
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown, true);
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("focusout", onFocusOut);
    canvas.addEventListener("input", onInput);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown, true);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("focusout", onFocusOut);
      canvas.removeEventListener("input", onInput);
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, [editor]);

  useEffect(() => {
    const pane = document.querySelector(".ww-editor-canvas") as HTMLElement | null;
    if (!pane || !editor?.selection) {
      setToolbarRect(null);
      return;
    }
    const root: HTMLElement = pane;

    function measure() {
      const selection = editor?.selection;
      if (!selection) {
        setToolbarRect(null);
        return;
      }
      const fromRef =
        selectedElRef.current?.isConnected && selectedElRef.current.dataset.wwPath === selection.path
          ? selectedElRef.current
          : null;
      const el = fromRef || findSelectedElement(root, selection);
      selectedElRef.current = el;
      if (!el) {
        setToolbarRect(null);
        return;
      }
      const next = clampRect(el.getBoundingClientRect(), root.getBoundingClientRect());
      // Measuring allocates a fresh rect every time. Keeping the previous
      // object when the geometry is unchanged stops the render that this
      // effect would otherwise trigger on itself.
      setToolbarRect((current) => (sameRect(current, next) ? current : next));
    }

    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    root.addEventListener("scroll", measure);
    const parent = root.parentElement;
    parent?.addEventListener("scroll", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      root.removeEventListener("scroll", measure);
      parent?.removeEventListener("scroll", measure);
    };
  }, [editor, editor?.selection, site?.content]);

  // Keeps the floating toolbar inside the work area: above the selection when
  // there is room, below it otherwise, and never underneath the top bar.
  useEffect(() => {
    const wrap = toolbarRef.current;
    if (!wrap || !toolbarRect) {
      setPlacement(null);
      return;
    }
    const pane = document.querySelector(".ww-editor-scroll")?.getBoundingClientRect();
    const bounds = {
      top: (pane?.top ?? 0) + 8,
      bottom: (pane?.bottom ?? window.innerHeight) - 8,
      left: (pane?.left ?? 0) + 12,
      right: (pane?.right ?? window.innerWidth) - 12,
    };

    function reposition() {
      const size = wrap!.getBoundingClientRect();
      let top = toolbarRect!.top - size.height - 10;
      if (top < bounds.top) top = toolbarRect!.bottom + 10;
      top = Math.min(Math.max(top, bounds.top), Math.max(bounds.top, bounds.bottom - size.height));
      const left = Math.min(
        Math.max(toolbarRect!.left, bounds.left),
        Math.max(bounds.left, bounds.right - size.width)
      );
      setPlacement((current) =>
        current && Math.abs(current.top - top) < 1 && Math.abs(current.left - left) < 1
          ? current
          : { top, left }
      );
    }

    reposition();
    if (typeof ResizeObserver === "undefined") return;
    // Opening a sub-panel (focal pad, video settings) changes the height.
    const observer = new ResizeObserver(reposition);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [toolbarRect]);

  // Mirrors the current selection onto the section wrapper so the canvas can
  // show which block is active without React re-rendering the whole template.
  useEffect(() => {
    const canvas = document.querySelector(".ww-editor-canvas");
    if (!canvas) return;
    const activeSection = sectionIdForSelection(editor?.selection ?? null);
    canvas.querySelectorAll("[data-ww-section]").forEach((node) => {
      if (node.getAttribute("data-ww-section") === activeSection) {
        node.setAttribute("data-ww-active", "1");
      } else {
        node.removeAttribute("data-ww-active");
      }
    });
  }, [editor?.selection, site?.content]);

  if (!site || site.mode !== "editor") return null;

  const selected = editor?.selection;
  const outline =
    hover && hover.path !== selected?.path
      ? {
          rect: clampRect(
            hover.el.getBoundingClientRect(),
            document.querySelector(".ww-editor-canvas")?.getBoundingClientRect()
          ),
          label: hover.label,
        }
      : null;
  return createPortal(
    <div className="ww-editor-ui pointer-events-none fixed inset-0 z-[80]" data-ww-chrome="1">
      {outline && outline.rect.width > 2 && outline.rect.height > 2 ? (
        <OutlineBox rect={outline.rect} label={outline.label} muted />
      ) : null}
      {selected && toolbarRect && toolbarRect.width > 2 && toolbarRect.height > 2 ? (
        <OutlineBox rect={toolbarRect} label={selected.label} />
      ) : null}
      {selected && toolbarRect ? (
        <div
          ref={toolbarRef}
          className="pointer-events-auto absolute"
          style={{
            top: placement?.top ?? toolbarRect.top,
            left: placement?.left ?? toolbarRect.left,
            visibility: placement ? "visible" : "hidden",
          }}
        >
          <EditorSelectionToolbar selection={selected} />
        </div>
      ) : null}
    </div>,
    document.body
  );
}

function OutlineBox({
  rect,
  label,
  muted,
}: {
  rect: DOMRect;
  label: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`absolute rounded-md border ${
        muted ? "border-[#C9A962]/45" : "border-[#C9A962]"
      }`}
      style={{
        top: rect.top - 2,
        left: rect.left - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        boxShadow: muted ? "none" : "0 0 0 1px rgba(201,169,98,0.28)",
        pointerEvents: "none",
      }}
    >
      <span className="absolute -top-6 right-0 rounded-full bg-[#C9A962] px-2 py-0.5 text-[10px] font-black text-white">
        {label}
      </span>
    </div>
  );
}

function toSelection(hover: HoverState): WeddingSiteSelection {
  if (hover.type === "media") return { type: "media", path: hover.path, label: hover.label };
  if (hover.type === "section") return { type: "section", path: hover.path, label: hover.label };
  if (hover.type === "gallery") return { type: "gallery", path: hover.path, label: hover.label };
  if (hover.type === "countdown") return { type: "countdown", path: hover.path, label: hover.label };
  return { type: "text", path: hover.path, label: hover.label };
}

function findSelectedElement(canvas: Element, selection: NonNullable<WeddingSiteSelection>) {
  const path = cssAttr(selection.path);
  const typed = canvas.querySelector(
    `[data-ww-path="${path}"][data-ww-edit="${selection.type}"]`
  ) as HTMLElement | null;
  if (typed) return typed;
  if (selection.type === "section") {
    const handle = canvas.querySelector(
      `.ww-section-handle[data-ww-path="${path}"]`
    ) as HTMLElement | null;
    if (handle) return handle;
  }
  const inner = canvas.querySelector(
    `[data-ww-path="${path}"]${INNER_EDIT}`
  ) as HTMLElement | null;
  return inner;
}

function sameRect(a: DOMRect | null, b: DOMRect | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function clampRect(rect: DOMRect, bounds?: DOMRect | null) {
  if (!bounds) return rect;
  const top = Math.max(rect.top, bounds.top);
  const left = Math.max(rect.left, bounds.left);
  const right = Math.min(rect.right, bounds.right);
  const bottom = Math.min(rect.bottom, bounds.bottom);
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

function labelFor(type: string) {
  if (type === "media") return "החלפת תמונה או סרטון";
  if (type === "section") return "עריכת מקטע";
  if (type === "countdown") return "ספירה לאחור";
  return "עריכת טקסט";
}

/** Nearest section id for a selection, used to highlight the active block. */
function sectionIdForSelection(selection: WeddingSiteSelection) {
  if (!selection) return "";
  if (selection.type === "section" || selection.type === "countdown") return selection.path;
  const canvas = document.querySelector(".ww-editor-canvas");
  if (!canvas) return "";
  const element = canvas.querySelector(
    `[data-ww-path="${cssAttr(selection.path)}"]`
  ) as HTMLElement | null;
  return element?.closest("[data-ww-section]")?.getAttribute("data-ww-section") || "";
}

function cssAttr(value: string) {
  return value.replace(/"/g, "");
}

function insertLineBreakAtCaret() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const br = document.createElement("br");
  range.insertNode(br);
  const spacer = document.createTextNode("\u200b");
  br.parentNode?.insertBefore(spacer, br.nextSibling);
  range.setStartAfter(spacer);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

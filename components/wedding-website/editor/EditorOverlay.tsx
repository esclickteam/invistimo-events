"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import type { WeddingSiteSelection } from "@/components/wedding-website/editable/WeddingSiteContext";
import { LOCKED_EVENT_PATHS } from "@/lib/weddingWebsite/editorSchema";
import { htmlToPlainTextWithBreaks } from "@/lib/weddingWebsite/textEditing";
import EditorSelectionToolbar from "./EditorSelectionToolbar";

const SKIP = "[data-ww-chrome],.ww-editor-ui,input,textarea,select,[data-rsvp-core]";

type HoverState = {
  type: string;
  path: string;
  label: string;
  rect: DOMRect;
};

export default function EditorOverlay() {
  const site = useWeddingSite();
  const editor = site?.editor;
  const [hover, setHover] = useState<HoverState | null>(null);
  const [toolbarRect, setToolbarRect] = useState<DOMRect | null>(null);
  const persistTimer = useRef<number | null>(null);

  useEffect(() => {
    const canvas = document.querySelector(".ww-editor-canvas") as HTMLElement | null;
    if (!canvas || !editor) return;
    const api = editor;

    function fromTarget(target: EventTarget | null): HoverState | null {
      const el = target instanceof Element ? target : null;
      if (!el) return null;
      if (el.closest(SKIP)) return null;
      const preferred = el.closest('[data-ww-edit="text"],[data-ww-edit="media"]') as HTMLElement | null;
      const hit = (preferred || el.closest("[data-ww-edit]")) as HTMLElement | null;
      if (!hit) return null;
      const type = hit.dataset.wwEdit || "";
      const path = hit.dataset.wwPath || "";
      if (!type || !path) return null;
      return {
        type,
        path,
        label: hit.dataset.wwLabel || labelFor(type),
        rect: hit.getBoundingClientRect(),
      };
    }

    function persistText(el: HTMLElement) {
      const path = el.dataset.wwPath || "";
      if (!path || LOCKED_EVENT_PATHS.has(path)) return;
      api.updateText(path, htmlToPlainTextWithBreaks(el));
    }

    function onPointerMove(event: PointerEvent) {
      setHover(fromTarget(event.target));
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      const next = fromTarget(event.target);
      if (!next) {
        api.setSelection(null);
        return;
      }

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
    if (!editor?.selection) {
      setToolbarRect(null);
      return;
    }
    const path = editor.selection.path;
    const el = document.querySelector(
      `.ww-editor-canvas [data-ww-path="${cssAttr(path)}"][data-ww-edit]`
    ) as HTMLElement | null;
    setToolbarRect(el?.getBoundingClientRect() || null);
  }, [editor?.selection, site?.content]);

  if (!site || site.mode !== "editor") return null;

  const selected = editor?.selection;
  const outline = hover && hover.path !== selected?.path ? hover : null;

  return createPortal(
    <div className="ww-editor-ui pointer-events-none fixed inset-0 z-[80]" data-ww-chrome="1">
      {outline ? <OutlineBox rect={outline.rect} label={outline.label} muted /> : null}
      {selected && toolbarRect ? (
        <OutlineBox rect={toolbarRect} label={selected.label} />
      ) : null}
      {selected && toolbarRect ? (
        <div
          className="pointer-events-auto absolute"
          style={{
            top: Math.max(8, toolbarRect.top - 56),
            left: Math.min(window.innerWidth - 24, Math.max(12, toolbarRect.left)),
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
  return { type: "text", path: hover.path, label: hover.label };
}

function labelFor(type: string) {
  if (type === "media") return "החלפת מדיה";
  if (type === "section") return "עריכת מקטע";
  return "עריכת טקסט";
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

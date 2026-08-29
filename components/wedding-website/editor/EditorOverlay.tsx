"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import type { WeddingSiteSelection } from "@/components/wedding-website/editable/WeddingSiteContext";
import { LOCKED_EVENT_PATHS } from "@/lib/weddingWebsite/editorSchema";
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
  const canvasRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const canvas = document.querySelector(".ww-editor-canvas") as HTMLElement | null;
    canvasRef.current = canvas;
    if (!canvas || !editor) return;
    const api = editor;

    function fromTarget(target: EventTarget | null): HoverState | null {
      const el = target instanceof Element ? target : null;
      if (!el) return null;
      if (el.closest(SKIP)) return null;
      const hit = el.closest("[data-ww-edit]") as HTMLElement | null;
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
      event.preventDefault();
      event.stopPropagation();
      const selection = toSelection(next);
      api.setSelection(selection);
      if (next.type === "text" && !LOCKED_EVENT_PATHS.has(next.path)) {
        enableInlineEdit(event.target, next.path, api.updateText);
      }
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor?.selection) {
      setToolbarRect(null);
      return;
    }
    const path = editor.selection.path;
    const el = document.querySelector(`[data-ww-path="${cssAttr(path)}"]`) as HTMLElement | null;
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
        muted ? "border-[#C9A962]/50" : "border-[#C9A962]"
      }`}
      style={{
        top: rect.top - 2,
        left: rect.left - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        boxShadow: muted ? "none" : "0 0 0 1px rgba(201,169,98,0.35)",
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

function enableInlineEdit(
  target: EventTarget | null,
  path: string,
  updateText: (path: string, value: string) => void
) {
  const el = target instanceof Element ? target.closest("[data-ww-path]") as HTMLElement | null : null;
  if (!el) return;
  el.contentEditable = "true";
  el.focus();
  const finish = () => {
    el.contentEditable = "false";
    updateText(path, (el.innerText || "").trim());
    el.removeEventListener("blur", finish);
  };
  el.addEventListener("blur", finish);
}

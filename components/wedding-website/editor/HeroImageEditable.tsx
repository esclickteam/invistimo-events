"use client";

import type { CSSProperties, ReactNode } from "react";
import { useWeddingEdit } from "./EditablePrimitives";

/** Clickable hero background layer for templates that use CSS background-image. */
export default function HeroImageEditable({
  src,
  className = "",
  style,
  children,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const edit = useWeddingEdit();

  if (!edit?.enabled) {
    return (
      <div
        className={className}
        style={{ ...style, backgroundImage: `url(${src})` }}
      >
        {children}
      </div>
    );
  }

  const selected =
    edit.selected?.kind === "image" && edit.selected.field === "heroImageUrl";

  return (
    <button
      type="button"
      className={`group relative block w-full overflow-hidden p-0 text-left ${className}`}
      style={{
        ...style,
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        cursor: "pointer",
        outline: selected ? "3px solid #B8844F" : undefined,
        outlineOffset: -3,
      }}
      data-ww-hero="1"
      data-ww-image="heroImageUrl"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        edit.setSelected({ kind: "image", field: "heroImageUrl" });
        edit.openImagePicker("heroImageUrl");
      }}
      title="לחצו להחלפת תמונת ה-Hero"
    >
      {children}
      <span className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-black/0 pt-8 transition group-hover:bg-black/25">
        <span className="rounded-full bg-white/95 px-4 py-2 text-xs font-black text-[#241A14] opacity-0 shadow group-hover:opacity-100">
          החלפת תמונת Hero
        </span>
      </span>
    </button>
  );
}

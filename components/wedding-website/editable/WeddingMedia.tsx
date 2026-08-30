"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  inferMediaSlotId,
  mediaElementStyle,
  mediaSlotFromImageUrl,
  optimizedMediaUrl,
  resolveMediaSlot,
} from "@/lib/weddingWebsite/media";
import { useWeddingSite } from "./WeddingSiteContext";
import { useEaseMobileScroll } from "../shared/weddingMotion";
import type { WeddingMediaSlot } from "@/types/weddingWebsite";

type Props = {
  src?: string;
  alt?: string;
  className?: string;
  slot?: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  controls?: boolean;
  editable?: boolean;
  placeholder?: boolean;
  style?: CSSProperties;
  loading?: string;
  decoding?: "async" | "auto" | "sync";
};

export default function WeddingMedia({
  src = "",
  alt = "",
  className = "",
  slot,
  poster,
  autoPlay,
  muted,
  loop,
  playsInline = true,
  controls = false,
  editable = true,
  placeholder = true,
  style,
}: Props) {
  const site = useWeddingSite();
  const easeMobileScroll = useEaseMobileScroll();
  const [broken, setBroken] = useState<"none" | "media" | "all">("none");
  const fallback = useMemo(() => {
    const base = mediaSlotFromImageUrl(src, alt);
    return {
      ...base,
      poster: poster || base.poster,
      autoplay: autoPlay ?? base.autoplay,
      muted: muted ?? base.muted,
      loop: loop ?? base.loop,
    } as WeddingMediaSlot;
  }, [src, alt, poster, autoPlay, muted, loop]);

  const slotId =
    slot ||
    inferMediaSlotId(src, site?.template, site?.content) ||
    (src ? fallback.src : "");

  const resolved =
    resolveMediaSlot(slotId, site?.content, fallback) || fallback;

  const mediaStyle = {
    ...mediaElementStyle(resolved),
    ...style,
  };
  const url = optimizedMediaUrl(resolved, 1800);
  const posterUrl = resolved.poster || poster || "";
  const isEditor = site?.mode === "editor" && editable;

  useEffect(() => {
    setBroken("none");
  }, [url, posterUrl]);

  if (!url || broken !== "none") {
    if (broken === "media" && posterUrl && posterUrl !== url) {
      return (
        <img
          src={posterUrl}
          alt={resolved.alt || alt}
          className={className}
          style={mediaStyle}
          data-ww-slot={slotId || undefined}
          data-ww-edit={isEditor ? "media" : undefined}
          data-ww-path={isEditor ? slotId : undefined}
          data-ww-label={isEditor ? "מדיה" : undefined}
          onError={() => setBroken("all")}
        />
      );
    }
    if (!isEditor) {
      if (!placeholder) return null;
      return (
        <div
          className={`bg-[#efe6d8] ${className}`}
          style={{ minHeight: "8rem", ...style }}
          aria-hidden
        />
      );
    }
    if (!placeholder) return null;
    return (
      <button
        type="button"
        data-ww-edit="media"
        data-ww-path={slotId}
        data-ww-label="מדיה"
        className={`flex min-h-[160px] w-full items-center justify-center border border-dashed border-[#C9A962]/50 bg-[#f7f1e8] text-sm font-semibold text-[#8A7B69] ${className}`}
      >
        הוסיפו תמונה או סרטון
      </button>
    );
  }

  if (resolved.type === "video") {
    return (
      <video
        src={url}
        poster={posterUrl || undefined}
        autoPlay={Boolean(resolved.autoplay && !easeMobileScroll)}
        muted={resolved.autoplay ? true : resolved.muted}
        loop={resolved.loop}
        playsInline={playsInline}
        preload={easeMobileScroll ? "metadata" : "auto"}
        controls={controls}
        className={className}
        style={mediaStyle}
        data-ww-slot={slotId || undefined}
        data-ww-edit={isEditor ? "media" : undefined}
        data-ww-path={isEditor ? slotId : undefined}
        data-ww-label={isEditor ? "מדיה" : undefined}
        onError={() => setBroken("media")}
      />
    );
  }

  return (
    <img
      src={url}
      alt={resolved.alt || alt}
      className={className}
      style={mediaStyle}
      data-ww-slot={slotId || undefined}
      data-ww-edit={isEditor ? "media" : undefined}
      data-ww-path={isEditor ? slotId : undefined}
      data-ww-label={isEditor ? "מדיה" : undefined}
      onError={() => setBroken("media")}
    />
  );
}

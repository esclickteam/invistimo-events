"use client";

import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type VideoHTMLAttributes,
} from "react";
import { WW_IMAGES } from "@/config/weddingWebsite/media";

const FALLBACK = WW_IMAGES.softPortrait;

function isUsableSrc(src?: string | null) {
  if (!src) return false;
  const s = src.trim();
  if (!s || s === "undefined" || s === "null") return false;
  // Broken leftover Unsplash query suffixes on local paths
  if (s.startsWith("/") && s.includes("&")) return false;
  return true;
}

export function SafeImage({
  src,
  alt = "",
  fallback = FALLBACK,
  className,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement> & { fallback?: string }) {
  const resolved = isUsableSrc(typeof src === "string" ? src : "")
    ? String(src).trim()
    : fallback;
  const [current, setCurrent] = useState(resolved);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrent(resolved);
    setFailed(false);
  }, [resolved]);

  if (failed && current === fallback) {
    return (
      <div
        className={`flex items-center justify-center bg-[#EDE6DC] text-xs font-bold text-[#8A7B69] ${className || ""}`}
        role="img"
        aria-label={alt || "media"}
      >
        תמונה
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={current}
      alt={alt}
      className={className}
      loading={rest.loading || "lazy"}
      onError={() => {
        if (current !== fallback) {
          setCurrent(fallback);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

export function SafeVideo({
  src,
  poster,
  className,
  fallbackPoster = FALLBACK,
  ...rest
}: VideoHTMLAttributes<HTMLVideoElement> & { fallbackPoster?: string }) {
  const usable = isUsableSrc(typeof src === "string" ? src : "");
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!usable || broken) {
    return (
      <SafeImage
        src={typeof poster === "string" ? poster : fallbackPoster}
        alt=""
        className={className}
        fallback={fallbackPoster}
      />
    );
  }

  return (
    <video
      {...rest}
      src={String(src).trim()}
      poster={
        isUsableSrc(typeof poster === "string" ? poster : "")
          ? poster
          : fallbackPoster
      }
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

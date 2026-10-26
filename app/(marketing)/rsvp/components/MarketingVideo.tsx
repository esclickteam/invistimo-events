"use client";

import type { RefObject } from "react";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";

type Props = {
  src: string;
  poster?: string;
  title: string;
  className?: string;
  /** Eager for hero; lazy for below-fold */
  eager?: boolean;
  /**
   * Legacy prop from older RSVP pages. Public policy always uses contain
   * (no crop); kept for call-site compatibility.
   */
  objectFit?: "cover" | "contain";
  videoRef?: RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (currentTime: number) => void;
  onSeeked?: (currentTime: number) => void;
};

/**
 * RSVP marketing video — delegates to the shared public autoplay policy
 * (muted loop, in-view play, contain, intrinsic aspect-ratio).
 */
export default function MarketingVideo({
  src,
  poster,
  title,
  className = "",
  eager = false,
  objectFit: _objectFit = "cover",
  videoRef,
  onTimeUpdate,
  onSeeked,
}: Props) {
  return (
    <PublicAutoplayVideo
      src={src}
      poster={poster}
      title={title}
      className={className}
      shellClassName="w-full"
      eager={eager}
      videoRef={videoRef}
      onTimeUpdate={onTimeUpdate}
      onSeeked={onSeeked}
      frameBg="#17120E"
    />
  );
}

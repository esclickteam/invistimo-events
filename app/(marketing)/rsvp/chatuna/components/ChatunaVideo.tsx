"use client";

import type { RefObject } from "react";
import PublicAutoplayVideo from "@/components/marketing/PublicAutoplayVideo";

type Props = {
  src: string;
  poster?: string;
  title: string;
  className?: string;
  eager?: boolean;
  /** @deprecated Always contain — kept for call-site compatibility */
  fit?: "cover" | "contain";
  videoRef?: RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (currentTime: number) => void;
};

/**
 * Chatuna marketing video — shared public autoplay policy, never crops.
 */
export default function ChatunaVideo({
  src,
  poster,
  title,
  className = "",
  eager = false,
  videoRef,
  onTimeUpdate,
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
      frameBg="#F7EDDF"
    />
  );
}

"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import {
  getWazeLink,
  getLocationQuery,
  type NavLocation,
} from "@/lib/navigationLinks";
import { resolveMapPinInBrowser } from "@/lib/resolveMapPin.client";

type Props = {
  location?: NavLocation | null;
  className?: string;
  children: ReactNode;
};

export default function WazeNavButton({ location, className, children }: Props) {
  const [opening, setOpening] = useState(false);
  const href = location ? getWazeLink(location) : null;
  const canResolve = Boolean(href || (location && getLocationQuery(location)));

  if (!location || !canResolve) return null;

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (href) return;

    event.preventDefault();
    if (opening) return;

    setOpening(true);
    try {
      const pin = await resolveMapPinInBrowser(location);
      const url = pin ? getWazeLink({ ...location, ...pin }) : null;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setOpening(false);
    }
  }

  return (
    <a
      href={href || "#"}
      onClick={handleClick}
      target={href ? "_blank" : undefined}
      rel="noopener noreferrer"
      aria-busy={opening}
      className={className}
    >
      {children}
    </a>
  );
}

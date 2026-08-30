"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  getLocationQuery,
  getWazeAppLink,
  getWazeLink,
  hasExactCoordinates,
  type NavLocation,
} from "@/lib/navigationLinks";
import { resolveMapPinInBrowser } from "@/lib/resolveMapPin.client";

type Props = {
  location?: NavLocation | null;
  className?: string;
  children: ReactNode;
};

function isMobileNav() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function WazeNavButton({ location, className, children }: Props) {
  const [resolved, setResolved] = useState<NavLocation | null>(null);
  const href = resolved ? getWazeLink(resolved) : null;
  const appHref = resolved ? getWazeAppLink(resolved) : null;
  const canShow = Boolean(
    location && (getLocationQuery(location) || hasExactCoordinates(location))
  );

  useEffect(() => {
    if (!location) {
      setResolved(null);
      return;
    }

    let cancelled = false;

    resolveMapPinInBrowser(location).then((pin) => {
      if (cancelled) return;
      setResolved(pin ? { ...location, ...pin } : location);
    });

    return () => {
      cancelled = true;
    };
  }, [location?.lat, location?.lng, location?.address, location?.name]);

  if (!location || !canShow) return null;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!href) {
      event.preventDefault();
      return;
    }

    if (!isMobileNav()) return;

    event.preventDefault();
    const appUrl = appHref || href;
    window.location.assign(appUrl);

    window.setTimeout(() => {
      if (document.visibilityState === "hidden") return;
      window.location.assign(href);
    }, 900);
  }

  return (
    <a
      href={href || undefined}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-disabled={!href}
    >
      {children}
    </a>
  );
}

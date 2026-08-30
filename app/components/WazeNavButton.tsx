"use client";

import { type MouseEvent, type ReactNode } from "react";
import {
  getWazeAppLink,
  getWazeLink,
  type NavLocation,
} from "@/lib/navigationLinks";

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
  const href = location ? getWazeLink(location) : null;
  const appHref = location ? getWazeAppLink(location) : null;

  if (!href) return null;

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
      href={href}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

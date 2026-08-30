"use client";

import { type MouseEvent, type ReactNode } from "react";
import {
  getWazeAppLink,
  getWazeLink,
  type NavCustomLinks,
  type NavLocation,
} from "@/lib/navigationLinks";

type Props = {
  location?: NavLocation | null;
  custom?: NavCustomLinks;
  className?: string;
  children: ReactNode;
};

function isMobileNav() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function WazeNavButton({
  location,
  custom,
  className,
  children,
}: Props) {
  const href = location ? getWazeLink(location, custom) : getWazeLink({}, custom);
  const appHref = location
    ? getWazeAppLink(location, custom)
    : getWazeAppLink({}, custom);

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

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type HeaderGateProps = {
  children: ReactNode;
};

export default function HeaderGate({ children }: HeaderGateProps) {
  const pathname = usePathname();

  // עמודי אורח / מערכת ללא Header. עמודי שיווק תחת `/rsvp/*` כן מציגים Header.
  const hideHeader =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/invitation/") ||
    pathname === "/w" ||
    pathname.startsWith("/w/") ||
    pathname === "/wedding-website" ||
    pathname.startsWith("/wedding-website/") ||
    pathname === "/set-password" ||
    pathname.startsWith("/set-password/");

  if (hideHeader) return null;

  return <>{children}</>;
}

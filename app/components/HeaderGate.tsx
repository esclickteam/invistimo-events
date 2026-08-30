"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type HeaderGateProps = {
  children: ReactNode;
};

export default function HeaderGate({ children }: HeaderGateProps) {
  const pathname = usePathname();

  // עמודים ללא Header
  const hideHeader =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
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

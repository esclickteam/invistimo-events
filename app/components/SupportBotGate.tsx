"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function SupportBotGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isExternalPage =
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/invitation/");

  if (isExternalPage) return null;

  return <>{children}</>;
}

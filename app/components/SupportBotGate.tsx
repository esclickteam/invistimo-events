"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type SupportBotGateProps = {
  children: ReactNode;
};

export default function SupportBotGate({ children }: SupportBotGateProps) {
  const pathname = usePathname();

  const isBlocked =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/invitation/");

  if (isBlocked) return null;

  return <>{children}</>;
}

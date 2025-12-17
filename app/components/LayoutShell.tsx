"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type LayoutShellProps = {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
};

export default function LayoutShell({
  children,
  header,
  footer,
}: LayoutShellProps) {
  const pathname = usePathname();

  // ❌ דפים ללא Header / Footer
  const hideLayout =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/invitation/");

  return (
    <>
      {!hideLayout && header}

      <main className={`min-h-screen ${!hideLayout ? "pt-[64px]" : ""}`}>
        {children}
      </main>

      {!hideLayout && footer}
    </>
  );
}

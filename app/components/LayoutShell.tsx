"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type LayoutShellProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
};

export default function LayoutShell({
  children,
  header,
  footer,
}: LayoutShellProps) {
  const pathname = usePathname();

  // ❌ דפים ציבוריים – בלי Header ובלי Footer
  const hideHeaderAndFooter =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/invitation/");

  // ❌ עורך הזמנות – בלי Footer בלבד
  const hideFooterOnly =
    pathname === "/dashboard/create-invite" ||
    pathname.startsWith("/dashboard/create-invite/") ||
    pathname === "/dashboard/edit-invite" ||
    pathname.startsWith("/dashboard/edit-invite/");

  return (
    <>
      {/* Header */}
      {!hideHeaderAndFooter && header}

      <main
        className={`min-h-screen ${
          !hideHeaderAndFooter && header ? "pt-[64px]" : ""
        }`}
      >
        {children}
      </main>

      {/* Footer */}
      {!hideHeaderAndFooter && !hideFooterOnly && footer}
    </>
  );
}

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type LayoutShellProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode; // optional
};

export default function LayoutShell({
  children,
  header,
  footer,
}: LayoutShellProps) {
  const pathname = usePathname();

  // רק לדפים ציבוריים באמת
  const hideLayout =
  pathname === "/thank-you" ||
  pathname.startsWith("/invite/") ||
  pathname.startsWith("/rsvp/") ||
  pathname.startsWith("/invitation/") ||
  pathname === "/dashboard/create-invite" ||
  pathname.startsWith("/dashboard/create-invite/") ||
  pathname === "/dashboard/edit-invite" ||
  pathname.startsWith("/dashboard/edit-invite/");

  return (
    <>
      {/* Header */}
      {!hideLayout && header}

      <main
        className={`min-h-screen ${
          !hideLayout && header ? "pt-[64px]" : ""
        }`}
      >
        {children}
      </main>

      {/* Footer – מוצג רק אם באמת הועבר */}
      {!hideLayout && footer}
    </>
  );
}

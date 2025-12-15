"use client";

import type { ReactNode, ComponentType } from "react";
import { usePathname } from "next/navigation";

export default function LayoutShell({
  children,
  Header,
  Footer,
}: {
  children: ReactNode;
  Header: ComponentType;
  Footer: ComponentType;
}) {
  const pathname = usePathname();

  // ✅ דפים חיצוניים (הזמנה / RSVP) – בלי Header/Footer
  const isExternalPage =
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/invitation/");

  return (
    <>
      {!isExternalPage && <Header />}
      <main className={`min-h-screen ${!isExternalPage ? "pt-[64px]" : ""}`}>
        {children}
      </main>
      {!isExternalPage && <Footer />}
    </>
  );
}

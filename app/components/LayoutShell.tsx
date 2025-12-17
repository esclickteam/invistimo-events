"use client";

import type { ReactNode, ComponentType } from "react";
import { usePathname } from "next/navigation";

type LayoutShellProps = {
  children: ReactNode;
  Header: ComponentType;
  Footer: ComponentType;
};

export default function LayoutShell({
  children,
  Header,
  Footer,
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
      {!hideLayout && <Header />}

      <main
        className={`min-h-screen ${
          !hideLayout ? "pt-[64px]" : ""
        }`}
      >
        {children}
      </main>

      {!hideLayout && <Footer />}
    </>
  );
}

"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Header from "./components/Header";
import Footer from "./components/Footer";
import LayoutShell from "./components/LayoutShell";
import SupportBotButton from "./components/SupportBotButton";
import SupportBotGate from "./components/SupportBotGate";

export default function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {isAdmin ? (
        children
      ) : (
        <LayoutShell header={<Header />} footer={<Footer />}>
          {children}
        </LayoutShell>
      )}

      {!isAdmin && (
        <SupportBotGate>
          <SupportBotButton />
        </SupportBotGate>
      )}
    </>
  );
}

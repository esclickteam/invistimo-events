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

  // 🟢 מפיק / הפקה – בלי Footer ובלי SupportBot
  const isProducer =
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events/production");

  // 🔴 Admin – בלי Header / Footer בכלל
  if (isAdmin) {
    return <>{children}</>;
  }

  // 🟡 Producer – Header כן, Footer לא
  if (isProducer) {
    return (
      <>
        <LayoutShell header={<Header />} footer={null}>
          {children}
        </LayoutShell>
      </>
    );
  }

  // 🟢 אתר רגיל
  return (
    <>
      <LayoutShell header={<Header />} footer={<Footer />}>
        {children}
      </LayoutShell>

      <SupportBotGate>
        <SupportBotButton />
      </SupportBotGate>
    </>
  );
}

// app/dashboard/layout.tsx
"use client";

import Providers from "../providers";

import Header from "../components/Header";
import Footer from "../components/Footer";
import LayoutShell from "../components/LayoutShell";
import SupportBotButton from "../components/SupportBotButton";
import SupportBotGate from "../components/SupportBotGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <LayoutShell Header={Header} Footer={Footer}>
        {children}
      </LayoutShell>

      {/* 💬 בוט תמיכה – רק בדשבורד */}
      <SupportBotGate>
        <SupportBotButton />
      </SupportBotGate>
    </Providers>
  );
}

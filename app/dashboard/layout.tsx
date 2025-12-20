"use client";

import { useState } from "react";
import DashboardHeader from "./DashboardHeader";
import DashboardMobileMenu from "./DashboardMobileMenu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf7f3]" dir="rtl">
      {/* Header עם המבורגר (מובייל בלבד) */}
      <DashboardHeader onOpenMenu={() => setMenuOpen(true)} />

      {/* תפריט דשבורד (מובייל) */}
      <DashboardMobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* תוכן הדשבורד */}
      <main>{children}</main>
    </div>
  );
}

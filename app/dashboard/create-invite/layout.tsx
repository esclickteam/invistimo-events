import type { ReactNode } from "react";

import Header from "@/app/components/Header";
import LayoutShell from "@/app/components/LayoutShell";

export default function CreateInviteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LayoutShell
      header={<Header />}
      footer={null}   // ❌ מבטל Footer גם ב-Create וגם ב-Edit
    >
      {children}
    </LayoutShell>
  );
}

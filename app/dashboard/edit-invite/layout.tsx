import type { ReactNode } from "react";
import Header from "@/app/components/Header";
import LayoutShell from "@/app/components/LayoutShell";

export default function EditInviteLayout({ children }: { children: ReactNode }) {
  return (
    <LayoutShell header={<Header />} footer={null}>
      {children}
    </LayoutShell>
  );
}

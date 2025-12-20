"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type SupportBotGateProps = {
  children: ReactNode;
};

export default function SupportBotGate({ children }: SupportBotGateProps) {
  const pathname = usePathname();

  // ✅ להציג את הבוט רק בעמוד הבית
  if (pathname !== "/") return null;

  return <>{children}</>;
}

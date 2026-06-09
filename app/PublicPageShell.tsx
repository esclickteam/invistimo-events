"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import ClientShell from "./ClientShell";
import SupportBotButton from "./components/SupportBotButton";

type PublicPageShellProps = {
  children: ReactNode;
};

export default function PublicPageShell({ children }: PublicPageShellProps) {
  const pathname = usePathname();

  const isPublicEventPage = pathname.startsWith("/e/");

  if (isPublicEventPage) {
    return <>{children}</>;
  }

  return (
    <>
      <ClientShell>{children}</ClientShell>

      {/* כפתור וואטסאפ / תמיכה — מופיע בכל האתר חוץ מעמוד האירוע הציבורי */}
      <SupportBotButton />
    </>
  );
}
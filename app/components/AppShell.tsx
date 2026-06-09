"use client";

import { usePathname } from "next/navigation";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();

  const hideHeaderFooter = pathname.startsWith("/e/");

  return (
    <>
      {!hideHeaderFooter && <Header />}

      {children}

      {!hideHeaderFooter && <Footer />}
    </>
  );
}
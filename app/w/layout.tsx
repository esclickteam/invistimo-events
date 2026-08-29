import type { ReactNode } from "react";
import "../wedding-website/wedding-website.css";

export default function LiveWeddingWebsiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="ww-site min-h-screen bg-white text-[#1a1a1a]" dir="rtl" lang="he">
      {children}
    </div>
  );
}

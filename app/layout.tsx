import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

import Providers from "./providers";
import AccessibilityScript from "./components/AccessibilityScript";
import ClientShell from "./ClientShell";


/* ✅ METADATA – זה מה שגוגל צריך */
export const metadata = {
  title: "Invistimo – ניהול אירועים חכם",
  description:
    "Invistimo – מערכת חכמה לניהול אירועים, הזמנות דיגיטליות, אישורי הגעה והושבה במקום אחד",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen font-[Heebo] bg-[#f7f3ee] text-[#5c4632]">
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />

        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>

        <AccessibilityScript />
      </body>
    </html>
  );
}

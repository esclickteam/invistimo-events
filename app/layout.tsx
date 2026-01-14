import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

import Providers from "./providers";
import AccessibilityScript from "./components/AccessibilityScript";
import ClientShell from "./ClientShell";

/* ======================================================
   METADATA – Title + Description + Favicon (חשוב!)
====================================================== */
export const metadata = {
  title: "Invistimo – ניהול אירועים חכם",
  description:
    "Invistimo – מערכת חכמה לניהול אירועים, הזמנות דיגיטליות, אישורי הגעה והושבה במקום אחד",

  icons: {
    icon: [
      { url: "/favicon.ico" },              // ברירת מחדל
      { url: "/favicon-16x16-v3.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32-v3.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96-v3.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },

  manifest: "/site.webmanifest",
};

/* ======================================================
   ROOT LAYOUT (Server Component)
====================================================== */
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

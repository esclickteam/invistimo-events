import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

import Providers from "./providers";
import AccessibilityScript from "./components/AccessibilityScript";
import ClientShell from "./ClientShell";
import SupportBotButton from "./components/SupportBotButton";

/* ======================================================
   METADATA – Title + Description + Canonical + Favicon
====================================================== */
export const metadata = {
  metadataBase: new URL("https://www.invistimo.com"),

  title: "Invistimo – ניהול אירועים חכם",
  description:
    "Invistimo – מערכת חכמה לניהול אירועים, הזמנות דיגיטליות, אישורי הגעה והושבה במקום אחד",

  alternates: {
    canonical: "https://www.invistimo.com/",
  },

  icons: {
    icon: [
      {
        url: "/favicon-v6.ico",
        sizes: "any",
      },
      {
        url: "/favicon-16x16-v6.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32-v6.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/android-chrome-192x192-v6.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512-v6.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/apple-touch-icon-v6.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],

    shortcut: ["/favicon-v6.ico"],
  },

  manifest: "/site-v6.webmanifest",
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

          {/* כפתור וואטסאפ / תמיכה — מופיע בכל האתר */}
          <SupportBotButton />
        </Providers>

        <AccessibilityScript />
      </body>
    </html>
  );
}
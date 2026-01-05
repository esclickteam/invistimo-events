import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

import Providers from "./providers";

import Header from "./components/Header";
import Footer from "./components/Footer";
import LayoutShell from "./components/LayoutShell";

import SupportBotButton from "./components/SupportBotButton";
import SupportBotGate from "./components/SupportBotGate";
import AccessibilityScript from "./components/AccessibilityScript";

/* =========================================================
   Metadata
   (Favicons with versioned URLs to break cache like BizUply)
========================================================= */
export const metadata = {
  metadataBase: new URL("https://www.invistimo.com"),

  alternates: {
    canonical: "/",
  },

  title: "Invistimo – הזמנות דיגיטליות ואישורי הגעה",
  description:
    "Invistimo – הזמנות דיגיטליות מעוצבות עם אישורי הגעה והושבה חכמה לכל סוגי האירועים.",

  icons: {
    icon: [
      // Keep an .ico (some crawlers/browsers still prefer it)
      { url: "/favicon-v3.ico?v=3", type: "image/x-icon" },

      // PNG sizes (clear in tabs + Google results)
      { url: "/favicon-16x16-v3.png?v=3", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32-v3.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96-v3.png?v=3", sizes: "96x96", type: "image/png" },
    ],

    apple: [{ url: "/apple-touch-icon-v3.png?v=3" }],

    shortcut: ["/favicon-v3.ico?v=3"],
  },

  // optional but nice for mobile UI chrome
  themeColor: "#f7f3ee",

  manifest: "/site.webmanifest",
};

/* =========================================================
   Root Layout
========================================================= */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen font-[Heebo] bg-[#f7f3ee] text-[#5c4632]">
        {/* 🌍 Google Maps + Places API */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />

        <Providers>
          <LayoutShell header={<Header />} footer={<Footer />}>
            {children}
          </LayoutShell>

          {/* 💬 בוט תמיכה – מוסתר בעמודי invite / thank-you */}
          <SupportBotGate>
            <SupportBotButton />
          </SupportBotGate>
        </Providers>

        {/* ♿ נגישות – רק בדפים ציבוריים (לא בדשבורד) */}
        <AccessibilityScript />
      </body>
    </html>
  );
}

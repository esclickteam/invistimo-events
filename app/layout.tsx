import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

import Providers from "./providers";
import AccessibilityScript from "./components/AccessibilityScript";
import PublicPageShell from "./PublicPageShell";

/* ======================================================
   METADATA – Title + Description + Canonical + Favicon
====================================================== */
export const metadata = {
  metadataBase: new URL("https://www.invistimo.com"),

  title: "Invistimo אישורי הגעה | ניהול אירועים, הזמנות דיגיטליות והושבה",

  description:
    "Invistimo אישורי הגעה היא מערכת חכמה לניהול אישורי הגעה לאירועים, הזמנות דיגיטליות, סידורי הושבה, תזכורות והודעות לאורחים במקום אחד.",

  applicationName: "Invistimo אישורי הגעה",

  keywords: [
    "Invistimo",
    "Invistimo אישורי הגעה",
    "אישורי הגעה",
    "אישורי הגעה לאירועים",
    "אישורי הגעה לחתונה",
    "ניהול אירועים",
    "ניהול מוזמנים",
    "הזמנות דיגיטליות",
    "סידורי הושבה",
    "הושבה לאירועים",
    "תזכורות לאורחים",
    "הודעות לאורחים",
  ],

  alternates: {
    canonical: "https://www.invistimo.com/",
  },

  openGraph: {
    title: "Invistimo אישורי הגעה | ניהול אירועים חכם",
    description:
      "Invistimo אישורי הגעה היא מערכת לניהול אישורי הגעה, הזמנות דיגיטליות, סידורי הושבה, תזכורות והודעות לאורחים.",
    url: "https://www.invistimo.com/",
    siteName: "Invistimo אישורי הגעה",
    locale: "he_IL",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Invistimo אישורי הגעה | ניהול אירועים חכם",
    description:
      "מערכת חכמה לניהול אישורי הגעה לאירועים, הזמנות דיגיטליות, סידורי הושבה ותזכורות לאורחים.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
          <PublicPageShell>{children}</PublicPageShell>
        </Providers>

        <AccessibilityScript />
      </body>
    </html>
  );
}
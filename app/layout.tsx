import "./globals.css";
import type { ReactNode } from "react";
import { Heebo } from "next/font/google";

import Providers from "./providers";
import AccessibilityScript from "./components/AccessibilityScript";
import PublicPageShell from "./PublicPageShell";
import GlobalSoftphoneMount from "./components/staff/GlobalSoftphoneMount";
import PrivateChromeHider from "./components/staff/PrivateChromeHider";
import { defaultPublicIndexable } from "@/lib/seo/site";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-heebo",
});

/* ======================================================
   METADATA – Title + Description + Canonical + Favicon
====================================================== */
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();

export const metadata = {
  metadataBase: new URL("https://www.invistimo.com"),

  title: "Invistimo אישורי הגעה | ניהול אירועים, הזמנות דיגיטליות והושבה",

  description:
    "Invistimo אישורי הגעה היא מערכת לניהול אישורי הגעה לאירועים, הזמנות דיגיטליות, סידורי הושבה, תזכורות והודעות לאורחים במקום אחד.",

  applicationName: "Invistimo",

  openGraph: {
    siteName: "Invistimo",
    locale: "he_IL",
    type: "website",
  },

  robots: (() => {
    const index = defaultPublicIndexable();
    return {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
      },
    };
  })(),

  ...(googleVerification || bingVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
        },
      }
    : {}),

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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* ======================================================
   ROOT LAYOUT (Server Component)
====================================================== */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable} suppressHydrationWarning>
      <body
        className={`${heebo.className} min-h-screen bg-[#f7f3ee] text-[#5c4632]`}
        suppressHydrationWarning
      >
        <Providers>
          <PrivateChromeHider />
          <GlobalSoftphoneMount />

          <PublicPageShell>{children}</PublicPageShell>
        </Providers>

        <AccessibilityScript />
      </body>
    </html>
  );
}

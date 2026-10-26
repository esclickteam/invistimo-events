import type { Metadata } from "next";
import { Assistant, Cormorant_Garamond, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const frank = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-frank",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ALBUM — אלבומים דיגיטליים חכמים לאירועים",
    template: "%s · ALBUM",
  },
  description:
    "אלבום דיגיטלי יוקרתי לאירועים: העלאת תמונות וסרטונים, Stories, ספר ברכות, LIVE וזיהוי פנים AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${cormorant.variable} ${frank.variable}`}>
      <body
        className="album-shell antialiased"
        style={{
          fontFamily: "var(--font-assistant), var(--font-body)",
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore CSS vars
          ["--font-display" as string]: "var(--font-cormorant), var(--font-frank), serif",
          ["--font-body" as string]: "var(--font-assistant), sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}

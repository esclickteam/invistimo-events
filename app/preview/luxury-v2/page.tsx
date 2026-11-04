import type { Metadata } from "next";
import LuxV2SaveTheDate from "@/components/marketing/luxury/v2/LuxV2SaveTheDate";
import LuxV2RsvpJourney from "@/components/marketing/luxury/v2/LuxV2RsvpJourney";
import LuxV2SeatingStory from "@/components/marketing/luxury/v2/LuxV2SeatingStory";

export const metadata: Metadata = {
  title: "Luxury Editorial v2 — Preview | Invistimo",
  robots: { index: false, follow: false },
};

/**
 * Stage-gate preview: three sample sections only.
 * Not linked from production nav. No index.
 */
export default function LuxuryV2PreviewPage() {
  return (
    <main className="lux-home bg-[#F5EEE8] text-[#2A1A22]">
      <header className="border-b border-[#C5A582]/35 bg-[#F5EEE8] px-4 py-10 text-center sm:px-6">
        <p className="text-xs font-bold tracking-[0.28em] text-[#842B4C]">
          INVISTIMO · PREVIEW ONLY
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#42182F] md:text-4xl">
          Luxury Editorial v2 — שלושה מקטעי דוגמה
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-[#6B5360]">
          Save the Date (שמפניה + גלריה אופקית) → RSVP/WhatsApp (ורוד עתיק + תהליך
          sticky) → הושבה (sticky storytelling עם הדגמת זרימה). גללו ברצף כדי לראות
          מעברי צבע ותנועה.
        </p>
      </header>

      <LuxV2SaveTheDate />
      <LuxV2RsvpJourney />
      <LuxV2SeatingStory />

      <footer className="border-t border-[#C5A582]/30 bg-[#F5EEE8] px-4 py-16 text-center">
        <p className="text-sm text-[#6B5360]">
          אין Merge / Deploy — ממתין לאישור לפני הרחבה לכל דף הבית.
        </p>
      </footer>
    </main>
  );
}

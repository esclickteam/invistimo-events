"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import InvitationPlate from "@/components/invitation-studio/InvitationPlate";
import { downloadPlateMp4 } from "@/components/invitation-studio/plateFilm";
import { EDITED_DETAILS } from "@/lib/invitationStudio/details";
import { libraryMusic } from "@/lib/invitationStudio/audioPlan";
import { getPlate } from "@/lib/invitationStudio/plates";

export default function WatchPlatePage() {
  const params = useParams<{ templateId: string }>();
  const plate = getPlate(params.templateId);
  const [phone, setPhone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  if (!plate) {
    return <main className="p-8" dir="rtl">התבנית לא נמצאה.</main>;
  }
  const edited = {
    ...plate,
    details:
      plate.category === "wedding"
        ? EDITED_DETAILS
        : {
            ...plate.details,
            brideName: plate.category === "brit" ? "איתי" : "נועם",
            weekday: EDITED_DETAILS.weekday,
            hebrewDate: EDITED_DETAILS.hebrewDate,
            gregorianDate: EDITED_DETAILS.gregorianDate,
            venue: "גן האירועים",
            address: EDITED_DETAILS.address,
          },
  };
  const music = plate.defaultMusic
    ? libraryMusic(plate.animation === "envelope" || plate.animation === "gold" ? "names" : "start")
    : null;
  return (
    <main dir="rtl" className="min-h-screen bg-[#f3eee7] px-4 py-8 text-[#2c241c]">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard/invitation-studio" className="text-sm font-bold text-[#8a5a25]">חזרה לקטלוג</Link>
        <h1 className="mt-3 text-4xl font-black">{plate.name}</h1>
        <p className="mt-2 text-sm text-[#6d5b4b]">אותו עיצוב, לפני החלפת הפרטים ואחריה. האנימציה היא חלק מהתבנית.</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <figure className="mx-auto w-full max-w-[420px]">
            <figcaption className="mb-3 text-sm font-black">לפני עריכה</figcaption>
            <InvitationPlate plate={plate} />
          </figure>
          <figure className="mx-auto w-full max-w-[420px]">
            <figcaption className="mb-3 text-sm font-black">אחרי עריכה</figcaption>
            <InvitationPlate plate={edited} />
          </figure>
        </div>
        <div className={`mx-auto mt-10 ${phone ? "max-w-[390px]" : "max-w-[420px]"}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">צפייה בהזמנה</h2>
            <button type="button" className="text-sm font-bold text-[#8a5a25]" onClick={() => setPhone((value) => !value)}>
              {phone ? "תצוגת מחשב" : "תצוגת טלפון"}
            </button>
          </div>
          <div className={phone ? "rounded-[36px] border-[10px] border-[#2c241c] bg-[#2c241c] p-2 shadow-xl" : ""}>
            <InvitationPlate plate={edited} cue music={music} />
          </div>
          <button
            type="button"
            disabled={exporting}
            className="mt-4 w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-black"
            onClick={async () => {
              setExporting(true);
              setExportError("");
              try {
                await downloadPlateMp4({ ...edited, speed: 1 }, music);
              } catch {
                setExportError("ייצוא הסרטון נכשל");
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? "מייצא סרטון…" : "ייצוא סרטון MP4"}
          </button>
          {exportError ? <p className="mt-2 text-sm font-bold text-red-700">{exportError}</p> : null}
        </div>
      </div>
    </main>
  );
}

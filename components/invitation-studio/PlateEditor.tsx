"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InvitationPlate from "@/components/invitation-studio/InvitationPlate";
import MusicTrim from "@/components/invitation-studio/MusicTrim";
import { downloadPlateMp4 } from "@/components/invitation-studio/plateFilm";
import { sanitizeDetails } from "@/lib/invitationStudio/details";
import { getPlate, STUDIO_PLATES } from "@/lib/invitationStudio/plates";
import type { InvitationDetails, StudioMusic, StudioSnapshot } from "@/lib/invitationStudio/types";

const FIELDS: Array<{ key: keyof InvitationDetails; label: string; area?: boolean }> = [
  { key: "brideName", label: "שם הכלה" },
  { key: "groomName", label: "שם החתן" },
  { key: "opening", label: "משפט פתיחה", area: true },
  { key: "weekday", label: "יום בשבוע" },
  { key: "hebrewDate", label: "תאריך עברי" },
  { key: "gregorianDate", label: "תאריך לועזי" },
  { key: "reception", label: "שעת קבלת פנים" },
  { key: "ceremony", label: "שעת חופה וקידושין" },
  { key: "venue", label: "שם האולם" },
  { key: "address", label: "כתובת מלאה" },
  { key: "brideParents", label: "שמות הורי הכלה" },
  { key: "groomParents", label: "שמות הורי החתן" },
  { key: "brideFamily", label: "משפחת הכלה" },
  { key: "groomFamily", label: "משפחת החתן" },
  { key: "closing", label: "משפט סיום וברכה" },
  { key: "extra", label: "פרטים נוספים", area: true },
  { key: "guestGreeting", label: "ברכה אישית לאורח ({name})" },
];

export default function PlateEditor({
  designId,
  initial,
}: {
  designId: string;
  initial: StudioSnapshot;
}) {
  const [plateId, setPlateId] = useState(initial.plate?.id || "");
  const [details, setDetails] = useState<InvitationDetails>(initial.plate!.details);
  const [speed, setSpeed] = useState(initial.plate?.speed || 1);
  const [music, setMusic] = useState<StudioMusic>(
    initial.music || { mode: "none", start: 0, end: 12, fadeIn: 0.4, fadeOut: 0.8, volume: 0.8, sync: "start" }
  );
  const [status, setStatus] = useState(initial.templateId ? "draft" : "draft");
  const [saveLabel, setSaveLabel] = useState("מוכן");
  const [personalUrl, setPersonalUrl] = useState("");
  const [error, setError] = useState("");
  const [playKey, setPlayKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const plate = getPlate(plateId);
  const view = plate
    ? { ...plate, details, speed, art: plate.art, animation: plate.animation, durationMs: plate.durationMs }
    : null;

  useEffect(() => {
    setSaveLabel("שומר…");
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/invitation-studio/designs/${designId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details, speed, music }),
      });
      setSaveLabel(res.ok ? "נשמר אוטומטית" : "שמירה נכשלה");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [details, speed, music, designId]);

  async function switchPlate(nextId: string) {
    setPlateId(nextId);
    setError("");
    const res = await fetch(`/api/invitation-studio/designs/${designId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: nextId, details }),
    });
    if (!res.ok) setError("לא הצלחנו להחליף תבנית");
    setPlayKey((value) => value + 1);
  }

  async function publish() {
    setError("");
    const res = await fetch(`/api/invitation-studio/designs/${designId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("הפרסום נעול עד לאישור זכאות.");
      return;
    }
    setStatus(data.status || "published");
  }

  async function testMessage() {
    const res = await fetch(`/api/invitation-studio/designs/${designId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test-message" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("אפשר לפתוח קישור אישי אחרי פרסום, בלי שליחה חיצונית.");
      return;
    }
    setPersonalUrl(String(data.personalUrl || ""));
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("אפשר להעלות קובץ שמע עד 1.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMusic({ ...music, mode: "upload", dataUrl: String(reader.result || ""), rightsConfirmed: music.rightsConfirmed });
    };
    reader.readAsDataURL(file);
  }

  if (!view || !plate) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f1ea] text-[#2c241c]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <section>
          <div key={playKey}>
            <InvitationPlate plate={view} cue music={music.mode === "none" ? null : music} />
          </div>
        </section>
        <section className="space-y-3 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/invitation-studio" className="text-sm font-bold text-[#8a5a25]">לקטלוג</Link>
            <span data-testid="studio-save-status" className="text-xs font-bold text-[#8a7055]">{saveLabel}</span>
          </div>
          <h1 className="text-3xl font-black">{plate.name}</h1>
          <p className="text-sm leading-6 text-[#6d5b4b]">
            העיצוב מוכן. מחליפים כאן רק את פרטי האירוע, והם נכנסים למקומות שנקבעו בתבנית.
          </p>
          <label className="block text-sm font-bold">
            תבנית
            <select
              value={plateId}
              onChange={(event) => switchPlate(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2"
            >
              {STUDIO_PLATES.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={details.showBasad}
              onChange={(event) => setDetails({ ...details, showBasad: event.target.checked })}
            />
            להציג בס״ד
          </label>
          {FIELDS.map((field) => (
            <label key={field.key} className="block text-sm font-bold">
              {field.label}
              {field.area ? (
                <textarea
                  value={String(details[field.key] || "")}
                  onChange={(event) => setDetails(sanitizeDetails({ ...details, [field.key]: event.target.value }, details))}
                  className="mt-1 h-20 w-full rounded-2xl border border-[#eadfce] px-3 py-2 font-medium"
                />
              ) : (
                <input
                  value={String(details[field.key] || "")}
                  onChange={(event) => setDetails(sanitizeDetails({ ...details, [field.key]: event.target.value }, details))}
                  className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2 font-medium"
                />
              )}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={details.brideParentsMemory}
              onChange={(event) => setDetails({ ...details, brideParentsMemory: event.target.checked })}
            />
            נוסח ז״ל להורי הכלה
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={details.groomParentsMemory}
              onChange={(event) => setDetails({ ...details, groomParentsMemory: event.target.checked })}
            />
            נוסח ז״ל להורי החתן
          </label>
          <label className="block text-sm font-bold">
            מהירות האנימציה
            <input
              type="range"
              min={0.7}
              max={1.4}
              step={0.1}
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <div className="rounded-3xl border border-[#eadfce] p-4">
            <p className="font-black">מוזיקת רקע</p>
            <p className="mt-1 text-xs leading-5 text-[#6d5b4b]">
              הספרייה כוללת מוטיב מקורי של הסטודיו בלבד. אין כאן שירים מסחריים.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
              {(["none", "library", "upload"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMusic({ ...music, mode })}
                  className={`rounded-full px-3 py-2 ${music.mode === mode ? "bg-[#2d241c] text-white" : "bg-[#f6f1ea]"}`}
                >
                  {mode === "none" ? "ללא מוזיקה" : mode === "library" ? "מוטיב מקורי" : "העלאה אישית"}
                </button>
              ))}
            </div>
            {music.mode === "upload" ? (
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-start gap-2 font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(music.rightsConfirmed)}
                    onChange={(event) => setMusic({ ...music, rightsConfirmed: event.target.checked })}
                  />
                  יש לי את הזכויות להשמעת הקובץ בהזמנה.
                </label>
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/mp4,audio/webm"
                  onChange={(event) => onFile(event.target.files?.[0])}
                />
              </div>
            ) : null}
            {music.mode !== "none" ? <MusicTrim music={music} onChange={setMusic} /> : null}
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              if (!view) return;
              setExporting(true);
              setError("");
              try {
                await downloadPlateMp4({ ...view, speed }, music.mode === "none" ? null : music);
              } catch {
                setError("ייצוא הסרטון נכשל");
              } finally {
                setExporting(false);
              }
            }}
            className="w-full rounded-2xl border px-4 py-3 text-sm font-black"
          >
            {exporting ? "מייצא סרטון…" : "ייצוא סרטון MP4"}
          </button>
          <button type="button" data-testid="studio-publish" onClick={publish} className="w-full rounded-2xl bg-[#2d241c] px-4 py-3 text-sm font-black text-white">
            פרסום לאורחים
          </button>
          <button type="button" data-testid="studio-test-message" onClick={testMessage} className="w-full rounded-2xl border px-4 py-3 text-sm font-bold">
            קישור אישי לבדיקה
          </button>
          <p className="text-xs text-[#6d5b4b]">סטטוס: {status === "published" ? "מפורסם" : "טיוטה"}</p>
          {personalUrl ? (
            <a data-testid="studio-personal-link" className="block text-sm font-bold text-[#8a5a25]" href={personalUrl}>
              פתיחת הקישור האישי
            </a>
          ) : null}
          {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  CATEGORY_LABELS,
  STYLE_LABELS,
  STUDIO_CATEGORIES,
  STUDIO_STYLES,
  type StudioCategory,
  type StudioStyle,
  type StudioTemplate,
} from "@/lib/invitationStudio/types";
import { ANIMATION_LABELS } from "@/lib/invitationStudio/plates";

type Row = StudioTemplate & { usageCount: number };
type PlateRow = {
  id: string;
  name: string;
  description: string;
  category: StudioCategory;
  style: StudioStyle;
  free: boolean;
  sort: number;
  published: boolean;
  defaultMusic?: boolean;
  animation: keyof typeof ANIMATION_LABELS;
  usageCount: number;
};

export default function AdminInvitationStudioPage() {
  const [templates, setTemplates] = useState<Row[]>([]);
  const [plates, setPlates] = useState<PlateRow[]>([]);
  const [price, setPrice] = useState("150");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState("");
  const [selectedPlate, setSelectedPlate] = useState("");
  const [musicLabel, setMusicLabel] = useState("מוטיב ערב");
  const [musicHasUpload, setMusicHasUpload] = useState(false);
  const [musicFileName, setMusicFileName] = useState("");

  async function load() {
    const res = await fetch("/api/admin/invitation-studio", { credentials: "include", cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "אין הרשאת אדמין");
      return;
    }
    setTemplates(data.templates || []);
    setPlates(data.plates || []);
    setPrice(String(data.settings?.priceIls ?? 150));
    setMusicLabel(String(data.settings?.music?.label || "מוטיב ערב"));
    setMusicHasUpload(Boolean(data.settings?.music?.hasUpload));
    setMusicFileName(String(data.settings?.music?.fileName || ""));
  }

  useEffect(() => {
    load();
  }, []);

  const current = templates.find((item) => item.id === selected) || null;
  const currentPlate = plates.find((item) => item.id === selectedPlate) || null;

  async function savePrice() {
    const res = await fetch("/api/admin/invitation-studio", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceIls: Number(price) }),
    });
    setMessage(res.ok ? "המחיר נשמר. חבילה קיימת לא מחויבת שוב." : "שמירת המחיר נכשלה");
  }

  async function saveTemplate(patch: Record<string, unknown>) {
    if (!current) return;
    const res = await fetch("/api/admin/invitation-studio", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", id: current.id, ...patch }),
    });
    setMessage(res.ok ? "התבנית נשמרה. עיצובים קיימים של לקוחות לא משתנים." : "שמירת התבנית נכשלה");
    await load();
  }

  async function savePlate(patch: Record<string, unknown>) {
    if (!currentPlate) return;
    const res = await fetch("/api/admin/invitation-studio", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-plate", id: currentPlate.id, ...patch }),
    });
    setMessage(res.ok ? "הלוח נשמר. הזמנות שכבר נשמרו אצל לקוחות לא משתנות." : "שמירת הלוח נכשלה");
    await load();
  }

  async function saveMusic(patch: Record<string, unknown>) {
    const res = await fetch("/api/admin/invitation-studio", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-music", ...patch }),
    });
    setMessage(res.ok ? "ספריית המוזיקה עודכנה." : "עדכון המוזיקה נכשל");
    await load();
  }

  async function duplicate() {
    if (!current) return;
    const res = await fetch("/api/admin/invitation-studio", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", fromId: current.id }),
    });
    const data = await res.json();
    setMessage(res.ok ? `נוצר עותק ${data.id}` : "השכפול נכשל");
    await load();
  }

  async function grant(enabled: boolean) {
    const res = await fetch("/api/admin/invitation-studio", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "entitlement", email, enabled }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `הזכאות עודכנה בלי חיוב: ${data.designedInvitationEnabled}` : "המשתמש לא נמצא");
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">סטודיו הזמנות</h1>
        <p className="text-sm text-[var(--admin-muted)]">
          לוחות גרפיים, מוזיקה, תבניות SVG, מחיר וזכאות. עריכה כאן לא משנה הזמנה שכבר נשמרה אצל לקוח.
        </p>
      </div>
      {message ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold">{message}</p> : null}
      <section className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-5">
        <h2 className="font-black">מחיר הזמנה דיגיטלית מעוצבת</h2>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">ברירת המחדל 150 ₪. בחבילות שכבר כוללות הזמנה דיגיטלית המחיר הנוסף הוא 0.</p>
        <div className="mt-3 flex gap-2">
          <input value={price} onChange={(event) => setPrice(event.target.value)} className="w-32 rounded-xl border px-3 py-2" />
          <button type="button" onClick={savePrice} className="rounded-xl bg-[#2d241c] px-4 py-2 text-sm font-bold text-white">
            שמירת מחיר
          </button>
        </div>
      </section>
      <section className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-5">
        <h2 className="font-black">הענקת זכאות בלי חיוב</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email" className="rounded-xl border px-3 py-2" />
          <button type="button" onClick={() => grant(true)} className="rounded-xl border px-4 py-2 text-sm font-bold">הענקה</button>
          <button type="button" onClick={() => grant(false)} className="rounded-xl border px-4 py-2 text-sm font-bold">ביטול</button>
        </div>
      </section>

      <section className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-5">
        <h2 className="font-black">מוזיקת ספרייה</h2>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          ברירת המחדל היא מוטיב מקורי של הסטודיו. אפשר להחליף בקובץ מורשה עד 1.5MB — בלי זה חוזרים לקובץ המובנה.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={musicLabel}
            onChange={(event) => setMusicLabel(event.target.value)}
            className="rounded-xl border px-3 py-2"
            placeholder="שם המקטע"
          />
          <button
            type="button"
            className="rounded-xl border px-4 py-2 text-sm font-bold"
            onClick={() => saveMusic({ label: musicLabel })}
          >
            שמירת שם
          </button>
          <audio controls src="/api/invitation-studio/music" className="h-10 max-w-full" />
        </div>
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          {musicHasUpload ? `קובץ מוחלף: ${musicFileName || "העלאה מותאמת"}` : "משתמשים בקובץ המובנה evening-motif.wav"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="rounded-xl border px-4 py-2 text-sm font-bold">
            החלפת קובץ
            <input
              type="file"
              accept="audio/mpeg,audio/wav,audio/mp4,audio/webm,.mp3,.wav,.m4a"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 1_500_000) {
                  setMessage("הקובץ גדול מ-1.5MB");
                  return;
                }
                const licensed = window.confirm("מאשרים שהקובץ ברישיון מסחרי מתאים לשימוש בהזמנות?");
                if (!licensed) return;
                const reader = new FileReader();
                reader.onload = () =>
                  saveMusic({
                    label: musicLabel,
                    dataUrl: String(reader.result || ""),
                    fileName: file.name,
                    rightsConfirmed: true,
                  });
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {musicHasUpload ? (
            <button
              type="button"
              className="rounded-xl border px-4 py-2 text-sm font-bold"
              onClick={() => saveMusic({ clearUpload: true })}
            >
              חזרה לקובץ המובנה
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-black">לוחות גרפיים (קטלוג הלקוח)</h2>
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="max-h-[70vh] space-y-2 overflow-auto rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-3">
            {plates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedPlate(item.id)}
                className={`block w-full rounded-2xl px-3 py-2 text-right text-sm ${selectedPlate === item.id ? "bg-[#fff4e4]" : ""}`}
              >
                <span className="font-black">{item.name}</span>
                <span className="mt-1 block text-xs text-[var(--admin-muted)]">
                  {item.usageCount} שימושים · {item.published ? "גלוי" : "מוסתר"} · {ANIMATION_LABELS[item.animation]}
                </span>
              </button>
            ))}
          </div>
          {currentPlate ? (
            <form
              key={currentPlate.id}
              className="space-y-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-5"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                savePlate({
                  name: form.get("name"),
                  description: form.get("description"),
                  sort: Number(form.get("sort")),
                  free: form.get("free") === "on",
                  hidden: form.get("hidden") === "on",
                  defaultMusic: form.get("defaultMusic") === "on",
                });
              }}
            >
              <input name="name" defaultValue={currentPlate.name} className="w-full rounded-xl border px-3 py-2" />
              <textarea name="description" defaultValue={currentPlate.description} className="h-20 w-full rounded-xl border px-3 py-2" />
              <input name="sort" type="number" defaultValue={currentPlate.sort} className="w-32 rounded-xl border px-3 py-2" />
              <label className="flex gap-2 text-sm"><input name="free" type="checkbox" defaultChecked={currentPlate.free} /> לוח ללא תשלום נוסף</label>
              <label className="flex gap-2 text-sm"><input name="hidden" type="checkbox" defaultChecked={!currentPlate.published} /> הסתרה מהקטלוג</label>
              <label className="flex gap-2 text-sm"><input name="defaultMusic" type="checkbox" defaultChecked={Boolean(currentPlate.defaultMusic)} /> מוזיקת ספרייה כברירת מחדל</label>
              <p className="text-xs text-[var(--admin-muted)]">
                {CATEGORY_LABELS[currentPlate.category]} · {STYLE_LABELS[currentPlate.style]} · מזהה {currentPlate.id}
              </p>
              <button type="submit" className="rounded-xl bg-[#2d241c] px-4 py-2 text-sm font-bold text-white">שמירת לוח</button>
            </form>
          ) : (
            <p className="text-sm text-[var(--admin-muted)]">בחרו לוח לעריכה.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-black">תבניות SVG (שכבה ישנה)</h2>
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="max-h-[70vh] space-y-2 overflow-auto rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-3">
            {templates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                className={`block w-full rounded-2xl px-3 py-2 text-right text-sm ${selected === item.id ? "bg-[#fff4e4]" : ""}`}
              >
                <span className="font-black">{item.name}</span>
                <span className="mt-1 block text-xs text-[var(--admin-muted)]">
                  {item.usageCount} שימושים · {item.published ? "גלויה" : "מוסתרת"} · {item.free ? "חינם" : "בתשלום"}
                </span>
              </button>
            ))}
          </div>
          {current ? (
            <form
              key={current.id}
              className="space-y-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-5"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                saveTemplate({
                  name: form.get("name"),
                  description: form.get("description"),
                  category: form.get("category"),
                  style: form.get("style"),
                  sort: Number(form.get("sort")),
                  free: form.get("free") === "on",
                  hidden: form.get("hidden") === "on",
                  palette: {
                    paper: form.get("paper"),
                    ink: form.get("ink"),
                    accent: form.get("accent"),
                    muted: form.get("muted"),
                    deep: form.get("deep"),
                  },
                });
              }}
            >
              <input name="name" defaultValue={current.name} className="w-full rounded-xl border px-3 py-2" />
              <textarea name="description" defaultValue={current.description} className="h-20 w-full rounded-xl border px-3 py-2" />
              <div className="grid grid-cols-2 gap-2">
                <select name="category" defaultValue={current.category} className="rounded-xl border px-3 py-2">
                  {STUDIO_CATEGORIES.map((item) => (
                    <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>
                  ))}
                </select>
                <select name="style" defaultValue={current.style} className="rounded-xl border px-3 py-2">
                  {STUDIO_STYLES.map((item) => (
                    <option key={item} value={item}>{STYLE_LABELS[item]}</option>
                  ))}
                </select>
              </div>
              <input name="sort" type="number" defaultValue={current.sort} className="w-32 rounded-xl border px-3 py-2" />
              <label className="flex gap-2 text-sm"><input name="free" type="checkbox" defaultChecked={current.free} /> תבנית ללא תשלום נוסף</label>
              <label className="flex gap-2 text-sm"><input name="hidden" type="checkbox" defaultChecked={!current.published} /> הסתרה מהקטלוג</label>
              <div className="grid grid-cols-5 gap-2">
                {(["paper", "ink", "accent", "muted", "deep"] as const).map((token) => (
                  <input key={token} name={token} type="color" defaultValue={current.palette[token]} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="rounded-xl bg-[#2d241c] px-4 py-2 text-sm font-bold text-white">שמירה</button>
                <button type="button" onClick={duplicate} className="rounded-xl border px-4 py-2 text-sm font-bold">שכפול</button>
              </div>
              <label className="block text-sm">
                רקע
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => saveTemplate({ backgroundImage: String(reader.result || "") });
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <label className="block text-sm">
                גופן woff2 עם אישור רישיון מסחרי
                <input
                  type="file"
                  accept=".woff2,font/woff2"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    const licensed = window.confirm("מאשרים שהגופן ברישיון מסחרי מתאים?");
                    if (!file || !licensed) return;
                    const reader = new FileReader();
                    reader.onload = () =>
                      saveTemplate({
                        fontFace: {
                          family: file.name.replace(/\.woff2$/i, ""),
                          dataUrl: String(reader.result || ""),
                          licenseConfirmed: true,
                        },
                      });
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </form>
          ) : (
            <p className="text-sm text-[var(--admin-muted)]">בחרו תבנית לעריכה.</p>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import InvitationArt from "@/components/invitation-studio/InvitationArt";
import PlateEditor from "@/components/invitation-studio/PlateEditor";
import { STUDIO_FONTS } from "@/lib/invitationStudio/fonts";
import { hebrewDateFromIso } from "@/lib/invitationStudio/hebrewDate";
import { renderSnapshot } from "@/lib/invitationStudio/render";
import type { StudioContent, StudioSnapshot, TextRole } from "@/lib/invitationStudio/types";

type EditorState = {
  content: StudioContent;
  palette: StudioSnapshot["palette"];
  layerOverrides: StudioSnapshot["layerOverrides"];
  images: StudioSnapshot["images"];
  personalGreeting: boolean;
};

const FIELDS: Array<{ role: TextRole; label: string }> = [
  { role: "hostNames", label: "שמות בעלי האירוע" },
  { role: "eventType", label: "סוג האירוע" },
  { role: "hebrewDate", label: "תאריך עברי" },
  { role: "gregorianDate", label: "תאריך לועזי" },
  { role: "receptionTime", label: "שעת קבלת פנים" },
  { role: "ceremonyTime", label: "שעת הטקס" },
  { role: "venueName", label: "שם האולם" },
  { role: "venueAddress", label: "כתובת" },
  { role: "wording", label: "נוסח ההזמנה" },
  { role: "kicker", label: "שורת פתיחה" },
  { role: "guestGreeting", label: "ברכה אישית ({name})" },
];

function stateFromSnapshot(snapshot: StudioSnapshot): EditorState {
  return {
    content: snapshot.content,
    palette: snapshot.palette,
    layerOverrides: snapshot.layerOverrides || {},
    images: snapshot.images || {},
    personalGreeting: Boolean(snapshot.personalGreeting),
  };
}

export default function InvitationStudioEditorPage() {
  const params = useParams<{ designId: string }>();
  const designId = params.designId;
  const [plateSnap, setPlateSnap] = useState<StudioSnapshot | null>(null);
  const [base, setBase] = useState<StudioSnapshot | null>(null);
  const [state, setState] = useState<EditorState | null>(null);
  const [status, setStatus] = useState("draft");
  const [shareId, setShareId] = useState("");
  const [personalUrl, setPersonalUrl] = useState("");
  const [testNote, setTestNote] = useState("");
  const [canPublish, setCanPublish] = useState(false);
  const [canExport, setCanExport] = useState(false);
  const [entitled, setEntitled] = useState(false);
  const [saveLabel, setSaveLabel] = useState("ממתין");
  const [advanced, setAdvanced] = useState(false);
  const [phone, setPhone] = useState(false);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [guestPreview, setGuestPreview] = useState("נועה");
  const history = useRef<EditorState[]>([]);
  const future = useRef<EditorState[]>([]);
  const drag = useRef<{ id: string; x: number; y: number; ox: number; oy: number } | null>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  const skipSave = useRef(true);

  useEffect(() => {
    fetch(`/api/invitation-studio/designs/${designId}`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "לא נמצאה הזמנה");
        if (data.design.snapshot?.plate) {
          setPlateSnap(data.design.snapshot);
          return;
        }
        setBase(data.design.snapshot);
        setState(stateFromSnapshot(data.design.snapshot));
        setStatus(data.design.status);
        if (data.shareId) setShareId(data.shareId);
        setCanPublish(Boolean(data.canPublish));
        setCanExport(Boolean(data.canExport));
        setEntitled(Boolean(data.entitlement?.entitled));
      })
      .catch((err) => setError(err.message));
  }, [designId]);

  const snapshot = useMemo(() => {
    if (!base || !state) return null;
    return { ...base, ...state };
  }, [base, state]);

  const rendered = snapshot ? renderSnapshot(snapshot, state?.personalGreeting ? guestPreview : "") : null;

  useEffect(() => {
    if (!state || skipSave.current) {
      skipSave.current = false;
      return;
    }
    setSaveLabel("שומר…");
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/invitation-studio/designs/${designId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      setSaveLabel(res.ok ? "נשמר אוטומטית" : "שמירה נכשלה");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [state, designId]);

  function commit(next: EditorState) {
    if (!state) return;
    history.current.push(state);
    if (history.current.length > 40) history.current.shift();
    future.current = [];
    setState(next);
  }

  function undo() {
    const previous = history.current.pop();
    if (!previous || !state) return;
    future.current.push(state);
    setState(previous);
  }

  function redo() {
    const next = future.current.pop();
    if (!next || !state) return;
    history.current.push(state);
    setState(next);
  }

  async function publish(action: "publish" | "unpublish") {
    setError("");
    const res = await fetch(`/api/invitation-studio/designs/${designId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        data.error === "ENTITLEMENT_REQUIRED"
          ? "פרסום נעול עד לאישור זכאות בשרת. התצוגה המקדימה נשארת פתוחה."
          : "הפרסום לא הושלם"
      );
      return;
    }
    setStatus(data.status);
    if (data.shareId) setShareId(data.shareId);
  }

  async function exportFile(kind: "png" | "pdf") {
    const gate = await fetch(`/api/invitation-studio/designs/${designId}?export=svg`, {
      credentials: "include",
    });
    if (gate.status === 403) {
      setError("ייצוא קובץ נקי נעול עד לאישור זכאות. אפשר להמשיך בתצוגה מקדימה.");
      return;
    }
    if (!gate.ok) {
      setError("הייצוא נכשל");
      return;
    }
    const svg = await gate.text();
    const { rasterizeSvg } = await import("@/lib/invitationStudio/rasterize");
    const canvas = await rasterizeSvg(svg, 2);
    if (kind === "png") {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "invitation.png";
      link.click();
      return;
    }
    const { PDFDocument } = await import("pdf-lib");
    const png = canvas.toDataURL("image/png").split(",")[1];
    const bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0));
    const pdf = await PDFDocument.create();
    const image = await pdf.embedPng(bytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    const file = await pdf.save();
    const copy = new Uint8Array(file.byteLength);
    copy.set(file);
    const blob = new Blob([copy.buffer], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "invitation.pdf";
    link.click();
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
      setError("אפשר לשלוח הודעת בדיקה רק אחרי פרסום, ובלי יציאה לספק חיצוני.");
      return;
    }
    setPersonalUrl(String(data.personalUrl || ""));
    setTestNote(String(data.message || "הודעת בדיקה נשמרה בלי שליחה חיצונית."));
  }

  async function buy() {
    const res = await fetch("/api/invitation-studio/checkout", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (data.alreadyEntitled) {
      setEntitled(true);
      setCanExport(true);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setError(data.message || "לא נפתח חיוב.");
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, id: string, x: number, y: number) {
    if (!advanced || !state) return;
    history.current.push(state);
    future.current = [];
    drag.current = { id, x: event.clientX, y: event.clientY, ox: x, oy: y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !artRef.current || !snapshot || !state) return;
    const rect = artRef.current.getBoundingClientRect();
    const dx = ((event.clientX - drag.current.x) / rect.width) * snapshot.width;
    const dy = ((event.clientY - drag.current.y) / rect.height) * snapshot.height;
    const id = drag.current.id;
    setState({
      ...state,
      layerOverrides: {
        ...state.layerOverrides,
        [id]: {
          ...(state.layerOverrides[id] || {}),
          x: Math.round(drag.current.ox + dx),
          y: Math.round(drag.current.oy + dy),
        },
      },
    });
  }

  if (plateSnap?.plate) {
    return <PlateEditor designId={designId} initial={plateSnap} />;
  }

  if (!snapshot || !state || !rendered) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7f1e8] text-[#6b5846]">
        {error || "טוען את העורך…"}
      </main>
    );
  }

  const selectedLayer = rendered.layers.find((layer) => layer.id === selected && layer.type === "text");

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f1e8] text-[#2d241c]">
      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 lg:grid-cols-[320px_minmax(0,1fr)_300px] lg:px-6">
        <section className="order-2 space-y-3 rounded-[28px] bg-white p-4 shadow-sm lg:order-1">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/invitation-studio" className="text-sm font-bold text-[#8a5a25]">
              לקטלוג
            </Link>
            <span data-testid="studio-save-status" className="text-xs font-bold text-[#8a7055]">
              {saveLabel}
            </span>
          </div>
          <h1 className="text-2xl font-black">עריכת ההזמנה</h1>
          <p className="text-xs leading-5 text-[#6b5846]">
            {entitled || snapshot.free
              ? "התבנית זמינה לפי הזכאות הקיימת. אין חיוב נוסף."
              : "תצוגה מקדימה פתוחה. פרסום וייצוא נקי דורשים זכאות מאומתת."}
          </p>
          {FIELDS.map((field) => (
            <label key={field.role} className="block text-sm font-bold">
              {field.label}
              {field.role === "wording" || field.role === "guestGreeting" ? (
                <textarea
                  value={state.content[field.role]}
                  onChange={(event) =>
                    commit({
                      ...state,
                      content: { ...state.content, [field.role]: event.target.value },
                    })
                  }
                  className="mt-1 h-20 w-full rounded-2xl border border-[#eadfce] px-3 py-2 font-medium"
                />
              ) : (
                <input
                  value={state.content[field.role]}
                  onChange={(event) =>
                    commit({
                      ...state,
                      content: { ...state.content, [field.role]: event.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2 font-medium"
                />
              )}
            </label>
          ))}
          <label className="block text-sm font-bold">
            תאריך לחישוב עברי
            <input
              type="date"
              lang="en-GB"
              className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2"
              onChange={(event) => {
                const hebrew = hebrewDateFromIso(event.target.value);
                const gregorian = event.target.value
                  ? new Intl.DateTimeFormat("he-IL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(new Date(`${event.target.value}T12:00:00`))
                  : state.content.gregorianDate;
                commit({
                  ...state,
                  content: {
                    ...state.content,
                    hebrewDate: hebrew || state.content.hebrewDate,
                    gregorianDate: gregorian,
                  },
                });
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={state.personalGreeting}
              onChange={(event) => commit({ ...state, personalGreeting: event.target.checked })}
            />
            ברכה אישית לאורח כשיש שם
          </label>
          <label className="block text-sm font-bold">
            תמונה אישית
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-1 block w-full text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file || file.size > 1_200_000) {
                  setError("אפשר להעלות תמונת PNG, JPEG או WEBP עד 1.2MB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () =>
                  commit({ ...state, images: { ...state.images, photo: String(reader.result || "") } });
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(state.palette) as Array<keyof typeof state.palette>).map((token) => (
              <label key={token} className="text-[10px] font-bold">
                {token}
                <input
                  type="color"
                  value={state.palette[token]}
                  onChange={(event) =>
                    commit({ ...state, palette: { ...state.palette, [token]: event.target.value } })
                  }
                  className="mt-1 h-10 w-full"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={undo} className="rounded-full bg-white px-4 py-2 text-sm font-bold">
              ביטול
            </button>
            <button type="button" onClick={redo} className="rounded-full bg-white px-4 py-2 text-sm font-bold">
              ביצוע חוזר
            </button>
            <button
              type="button"
              onClick={() => setAdvanced((value) => !value)}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold"
            >
              {advanced ? "עורך מתקדם פתוח" : "עורך מתקדם"}
            </button>
            <button
              type="button"
              onClick={() => setPhone((value) => !value)}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold"
            >
              {phone ? "תצוגת מחשב" : "תצוגת טלפון"}
            </button>
          </div>
          <div className={phone ? "mx-auto max-w-[390px] rounded-[36px] border-[10px] border-[#2d241c] bg-[#f7efe5] p-3 shadow-xl" : "mx-auto max-w-xl"}>
            <div
              ref={artRef}
              className="relative"
              onPointerMove={onPointerMove}
              onPointerUp={() => {
                drag.current = null;
              }}
            >
              <InvitationArt snapshot={snapshot} guestName={state.personalGreeting ? guestPreview : ""} />
              {advanced
                ? rendered.layers
                    .filter((layer) => layer.type === "text" || layer.type === "image")
                    .map((layer) => (
                      <button
                        key={layer.id}
                        type="button"
                        aria-label={layer.id}
                        onPointerDown={(event) => onPointerDown(event, layer.id, layer.x, layer.y)}
                        onClick={() => setSelected(layer.id)}
                        className={`absolute border ${selected === layer.id ? "border-[#c89545]" : "border-transparent"}`}
                        style={{
                          left: `${(layer.x / snapshot.width) * 100}%`,
                          top: `${(layer.y / snapshot.height) * 100}%`,
                          width: `${(layer.w / snapshot.width) * 100}%`,
                          height: `${(layer.h / snapshot.height) * 100}%`,
                        }}
                      />
                    ))
                : null}
            </div>
            <div className="mt-4 rounded-3xl bg-white/90 p-4 text-center">
              <p className="text-lg font-black">נשמח לדעת אם תגיעו</p>
              <p className="mt-1 text-xs text-[#8a7055]">תצוגה של המשך הקישור האישי. האישור עצמו נשמר במערכת הקיימת.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold text-[#8a7055]">
                <span className="rounded-2xl bg-[#f7f1e8] px-3 py-3">מגיעים</span>
                <span className="rounded-2xl bg-[#f7f1e8] px-3 py-3">לא מגיעים</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="order-3 space-y-3 rounded-[28px] bg-white p-4 shadow-sm">
          <p className="text-sm font-black">פרסום והורדה</p>
          <p className="text-xs leading-5 text-[#6b5846]">סטטוס: {status === "published" ? "מפורסם בקישור האישי" : "טיוטה"}</p>
          <button
            type="button"
            data-testid="studio-publish"
            onClick={() => publish("publish")}
            className="w-full rounded-2xl bg-[#2d241c] px-4 py-3 text-sm font-black text-white"
          >
            פרסום לאורחים
          </button>
          <button type="button" onClick={() => publish("unpublish")} className="w-full rounded-2xl border px-4 py-3 text-sm font-bold">
            הסרה מהקישור
          </button>
          <button type="button" data-testid="studio-export-png" onClick={() => exportFile("png")} className="w-full rounded-2xl border px-4 py-3 text-sm font-bold">
            הורדת תמונה
          </button>
          <button type="button" onClick={() => exportFile("pdf")} className="w-full rounded-2xl border px-4 py-3 text-sm font-bold">
            הורדת PDF
          </button>
          <button type="button" data-testid="studio-test-message" onClick={testMessage} className="w-full rounded-2xl border px-4 py-3 text-sm font-bold">
            הודעת בדיקה וקישור אישי
          </button>
          {!canExport ? (
            <button type="button" onClick={buy} className="w-full rounded-2xl bg-[#c89545] px-4 py-3 text-sm font-black text-white">
              בדיקת רכישה
            </button>
          ) : null}
          {personalUrl ? (
            <a
              data-testid="studio-personal-link"
              className="block break-all text-sm font-bold text-[#8a5a25]"
              href={personalUrl}
            >
              פתיחת הקישור האישי
            </a>
          ) : shareId ? (
            <p className="text-xs leading-5 text-[#6b5846]">
              הקישור האישי של האורח נוצר מכפתור הודעת הבדיקה, בלי שליחה לוואטסאפ.
            </p>
          ) : null}
          {testNote ? <p className="text-xs leading-5 text-[#6b5846]">{testNote}</p> : null}
          <label className="block text-sm font-bold">
            שם לדוגמה בתצוגה
            <input
              value={guestPreview}
              onChange={(event) => setGuestPreview(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#eadfce] px-3 py-2"
            />
          </label>
          {selectedLayer && selectedLayer.type === "text" ? (
            <div className="space-y-2 border-t border-[#eadfce] pt-3">
              <p className="text-sm font-black">שכבת טקסט</p>
              <label className="block text-xs font-bold">
                גופן
                <select
                  value={String(selectedLayer.fontFamily)}
                  onChange={(event) =>
                    commit({
                      ...state,
                      layerOverrides: {
                        ...state.layerOverrides,
                        [selectedLayer.id]: {
                          ...(state.layerOverrides[selectedLayer.id] || {}),
                          fontFamily: event.target.value,
                        },
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border px-2 py-2"
                >
                  {STUDIO_FONTS.map((font) => (
                    <option key={font.family} value={font.family}>
                      {font.family}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold">
                גודל
                <input
                  type="number"
                  value={selectedLayer.fontSize}
                  onChange={(event) =>
                    commit({
                      ...state,
                      layerOverrides: {
                        ...state.layerOverrides,
                        [selectedLayer.id]: {
                          ...(state.layerOverrides[selectedLayer.id] || {}),
                          fontSize: Number(event.target.value),
                        },
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border px-2 py-2"
                />
              </label>
            </div>
          ) : (
            <p className="text-xs leading-5 text-[#8a7055]">בעורך המתקדם גוררים טקסט או תמונה. הניקוד נשמר כמו שהוקלד.</p>
          )}
          {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
          <p className="text-xs leading-5 text-[#8a7055]">
            הפורמטים הזמינים: תמונה, PDF וקישור דיגיטלי
            {snapshot.formats.animated ? ", כולל אנימציה עדינה" : ""}. ייצוא סרטון אינו מוצע.
          </p>
          <p className="hidden">{String(canPublish)}</p>
        </aside>
      </div>
    </main>
  );
}

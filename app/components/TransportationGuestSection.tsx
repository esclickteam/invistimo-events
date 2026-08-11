"use client";

import { useEffect, useMemo, useState } from "react";

type PublicRoute = {
  _id: string;
  name: string;
  direction: string;
  departureTime?: string;
  returnTime?: string;
  capacity: number;
  registered: number;
  remaining: number;
  full: boolean;
};

type PublicStop = {
  _id: string;
  routeId: string;
  name: string;
  address?: string;
  time?: string;
  landmark?: string;
  mapLink?: string;
  stopType?: string;
};

type Props = {
  shareId: string;
  guestToken?: string;
};

export default function TransportationGuestSection({
  shareId,
  guestToken,
}: Props) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<PublicRoute[]>([]);
  const [stops, setStops] = useState<PublicStop[]>([]);
  const [notes, setNotes] = useState("");
  const [existing, setExisting] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    passengerCount: "1",
    needsOutbound: true,
    outboundRouteId: "",
    outboundStopId: "",
    needsReturn: false,
    returnRouteId: "",
    returnStopId: "",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (guestToken) params.set("token", guestToken);
        const res = await fetch(
          `/api/invite/${shareId}/transportation?${params.toString()}`
        );
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.available) {
          setAvailable(false);
          setLoading(false);
          return;
        }
        setAvailable(true);
        setRoutes(data.routes || []);
        setStops(data.stops || []);
        setNotes(data.settings?.notes || "");
        if (data.guestPrefill) {
          setForm((prev) => ({
            ...prev,
            name: data.guestPrefill.name || prev.name,
            phone: data.guestPrefill.phone || prev.phone,
          }));
        }
        if (data.existingRegistration) {
          setExisting(data.existingRegistration);
          setSubmitted(true);
        }
      } catch {
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [shareId, guestToken]);

  const outboundRoutes = useMemo(
    () =>
      routes.filter(
        (r) => r.direction === "outbound" || r.direction === "round_trip"
      ),
    [routes]
  );
  const returnRoutes = useMemo(
    () =>
      routes.filter(
        (r) => r.direction === "return" || r.direction === "round_trip"
      ),
    [routes]
  );

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/invite/${shareId}/transportation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          passengerCount: Number(form.passengerCount || 1),
          token: guestToken || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error === "ROUTE_FULL") {
          setError("הקו מלא — בחרו קו אחר או צרו קשר עם בעלי האירוע");
        } else if (data?.error === "GUEST_ALREADY_REGISTERED") {
          setExisting(data.registration);
          setSubmitted(true);
        } else {
          setError("לא הצלחנו לשמור את ההרשמה. בדקו את הפרטים.");
        }
        return;
      }
      setExisting(data.registration);
      setSubmitted(true);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !available) return null;

  return (
    <section
      className="mt-7 w-full max-w-md rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-[0_20px_70px_rgba(92,66,38,0.12)]"
      dir="rtl"
    >
      <h2 className="font-serif text-2xl font-black text-[#3a2c20]">
        הסעות לאירוע
      </h2>
      <p className="mt-1 text-sm text-[#6b6046]">
        הרשמה להסעה הלוך ו/או חזור — נפרד מאישור ההגעה
      </p>
      {notes ? (
        <p className="mt-2 rounded-2xl bg-[#FBF7F0] px-3 py-2 text-xs text-[#5a4634]">
          {notes}
        </p>
      ) : null}

      {submitted && existing ? (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-800">
          ✓ נרשמתם להסעה
          <div className="mt-1 font-medium">
            {existing.name} · {existing.passengerCount} נוסעים
            {existing.needsOutbound ? " · הלוך" : ""}
            {existing.needsReturn ? " · חזור" : ""}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <input
            className="w-full rounded-2xl border border-[#eadfce] px-3 py-3 text-sm"
            placeholder="שם מלא"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="w-full rounded-2xl border border-[#eadfce] px-3 py-3 text-sm"
            placeholder="טלפון"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <input
            className="w-full rounded-2xl border border-[#eadfce] px-3 py-3 text-sm"
            placeholder="כמות נוסעים בהסעה"
            value={form.passengerCount}
            onChange={(e) =>
              setForm((p) => ({ ...p, passengerCount: e.target.value }))
            }
          />

          <label className="flex items-center gap-2 text-sm font-bold text-[#3a2c20]">
            <input
              type="checkbox"
              checked={form.needsOutbound}
              onChange={(e) =>
                setForm((p) => ({ ...p, needsOutbound: e.target.checked }))
              }
            />
            הסעה הלוך
          </label>

          {form.needsOutbound && (
            <>
              <select
                className="w-full rounded-2xl border border-[#eadfce] px-3 py-3 text-sm"
                value={form.outboundRouteId}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    outboundRouteId: e.target.value,
                    outboundStopId: "",
                  }))
                }
              >
                <option value="">בחרו קו הלוך</option>
                {outboundRoutes.map((r) => (
                  <option key={r._id} value={r._id} disabled={r.full}>
                    {r.name}
                    {r.departureTime ? ` · ${r.departureTime}` : ""}
                    {r.full
                      ? " (מלא)"
                      : ` (${r.remaining} מקומות)`}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-2xl border border-[#eadfce] px-3 py-3 text-sm"
                value={form.outboundStopId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, outboundStopId: e.target.value }))
                }
              >
                <option value="">נקודת איסוף</option>
                {stops
                  .filter((s) => s.routeId === form.outboundRouteId)
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                      {s.time ? ` · ${s.time}` : ""}
                    </option>
                  ))}
              </select>
            </>
          )}

          <label className="flex items-center gap-2 text-sm font-bold text-[#3a2c20]">
            <input
              type="checkbox"
              checked={form.needsReturn}
              onChange={(e) =>
                setForm((p) => ({ ...p, needsReturn: e.target.checked }))
              }
            />
            הסעה חזור
          </label>

          {form.needsReturn && (
            <>
              <select
                className="w-full rounded-2xl border border-[#eadfce] px-3 py-3 text-sm"
                value={form.returnRouteId}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    returnRouteId: e.target.value,
                    returnStopId: "",
                  }))
                }
              >
                <option value="">בחרו שעת חזור</option>
                {returnRoutes.map((r) => (
                  <option key={r._id} value={r._id} disabled={r.full}>
                    {r.name}
                    {r.departureTime ? ` · ${r.departureTime}` : ""}
                    {r.full ? " (מלא)" : ""}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-2xl border border-[#eadfce] px-3 py-3 text-sm"
                value={form.returnStopId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, returnStopId: e.target.value }))
                }
              >
                <option value="">נקודת הורדה (אופציונלי)</option>
                {stops
                  .filter((s) => s.routeId === form.returnRouteId)
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </>
          )}

          <textarea
            className="w-full rounded-2xl border border-[#eadfce] px-3 py-3 text-sm"
            placeholder="הערות"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="w-full rounded-2xl bg-gradient-to-l from-[#c79a55] to-[#8f6437] px-5 py-4 text-lg font-black text-white disabled:opacity-70"
          >
            {busy ? "שומר…" : "הרשמה להסעה"}
          </button>
        </div>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type TabKey = "overview" | "routes" | "passengers" | "dayof" | "manifest";

type RouteRow = {
  _id: string;
  name: string;
  direction: "outbound" | "return" | "round_trip";
  departureTime?: string;
  returnTime?: string;
  capacity: number;
  companyName?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  notes?: string;
  active: boolean;
  status: string;
  sortOrder?: number;
};

type StopRow = {
  _id: string;
  routeId: string;
  name: string;
  address?: string;
  time?: string;
  sortOrder: number;
  notes?: string;
  landmark?: string;
  mapLink?: string;
  stopType?: string;
};

type RegistrationRow = {
  _id: string;
  name: string;
  phone?: string;
  passengerCount: number;
  needsOutbound: boolean;
  outboundRouteId?: string | null;
  outboundStopId?: string | null;
  needsReturn: boolean;
  returnRouteId?: string | null;
  returnStopId?: string | null;
  notes?: string;
  status: string;
  outboundBoardStatus: string;
  returnBoardStatus: string;
  invitationGuestId?: string | null;
};

const DIRECTION_LABEL: Record<string, string> = {
  outbound: "הלוך",
  return: "חזור",
  round_trip: "הלוך וחזור",
};

const BOARD_LABEL: Record<string, string> = {
  registered: "רשום",
  checked_in: "צ׳ק־אין",
  boarded: "עלה",
  no_show: "לא הגיע",
  cancelled: "בוטל",
  not_needed: "לא רלוונטי",
};

const LEVEL_STYLE: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning_80: "bg-amber-50 text-amber-800 border-amber-200",
  warning_90: "bg-orange-50 text-orange-800 border-orange-200",
  full: "bg-rose-50 text-rose-800 border-rose-200",
};

function CapacityBar({
  registered,
  capacity,
  level,
}: {
  registered: number;
  capacity: number;
  level: string;
}) {
  const pct =
    capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 100;
  const bar =
    level === "full"
      ? "bg-rose-500"
      : level === "warning_90"
        ? "bg-orange-500"
        : level === "warning_80"
          ? "bg-amber-500"
          : "bg-[#8f6437]";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#5a4634]">
        <span>
          {registered} / {capacity}
        </span>
        <span className={`rounded-full border px-2 py-0.5 ${LEVEL_STYLE[level] || LEVEL_STYLE.ok}`}>
          {level === "full" ? "FULL" : `${pct}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#efe4d6]">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function TransportationDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const eventId = searchParams.get("eventId") || "";

  const canAccess =
    user?.accessModules?.transportationManagement === true ||
    user?.includeTransportationManagement === true;

  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [guestsWithoutTransport, setGuestsWithoutTransport] = useState<any[]>([]);

  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filterDirection, setFilterDirection] = useState("all");
  const [filterRouteId, setFilterRouteId] = useState("all");
  const [filterStopId, setFilterStopId] = useState("all");

  const [routeForm, setRouteForm] = useState({
    name: "",
    direction: "outbound",
    departureTime: "",
    returnTime: "",
    capacity: "50",
    companyName: "",
    driverName: "",
    driverPhone: "",
    vehicleNumber: "",
    notes: "",
  });

  const [stopForm, setStopForm] = useState({
    name: "",
    address: "",
    time: "",
    landmark: "",
    mapLink: "",
    notes: "",
  });

  const [regForm, setRegForm] = useState({
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

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/transportation`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.code || data?.error || "LOAD_FAILED");
        setLoading(false);
        return;
      }
      setSettings(data.settings);
      setSummary(data.summary);
      setRoutes(data.routes || []);
      setStops(data.stops || []);
      setRegistrations(data.registrations || []);
      setGuestsWithoutTransport(data.guestsWithoutTransport || []);
      if (!selectedRouteId && data.routes?.[0]?._id) {
        setSelectedRouteId(data.routes[0]._id);
      }
    } catch {
      setError("LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedRouteId]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccess) return;
    if (!eventId) return;
    load();
  }, [authLoading, canAccess, eventId, load]);

  const routeMap = useMemo(
    () => new Map(routes.map((r) => [r._id, r])),
    [routes]
  );
  const stopMap = useMemo(
    () => new Map(stops.map((s) => [s._id, s])),
    [stops]
  );

  const outboundRoutes = routes.filter(
    (r) => r.active && (r.direction === "outbound" || r.direction === "round_trip")
  );
  const returnRoutes = routes.filter(
    (r) => r.active && (r.direction === "return" || r.direction === "round_trip")
  );

  const selectedRouteStops = stops
    .filter((s) => s.routeId === selectedRouteId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      if (r.status === "cancelled" && filterDirection !== "cancelled") {
        // still show cancelled only when explicitly filtered via search? keep them out of main
      }
      if (search) {
        const q = search.trim().toLowerCase();
        const hay = `${r.name} ${r.phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterDirection === "outbound" && !r.needsOutbound) return false;
      if (filterDirection === "return" && !r.needsReturn) return false;
      if (filterDirection === "active" && r.status !== "registered") return false;
      if (filterDirection === "cancelled" && r.status !== "cancelled") return false;
      if (filterRouteId !== "all") {
        if (
          String(r.outboundRouteId) !== filterRouteId &&
          String(r.returnRouteId) !== filterRouteId
        ) {
          return false;
        }
      }
      if (filterStopId !== "all") {
        if (
          String(r.outboundStopId) !== filterStopId &&
          String(r.returnStopId) !== filterStopId
        ) {
          return false;
        }
      }
      return true;
    });
  }, [registrations, search, filterDirection, filterRouteId, filterStopId]);

  async function createRoute() {
    if (!routeForm.name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/transportation/routes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...routeForm,
          capacity: Number(routeForm.capacity || 50),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || "שגיאה ביצירת קו");
        return;
      }
      setRouteForm({
        name: "",
        direction: "outbound",
        departureTime: "",
        returnTime: "",
        capacity: "50",
        companyName: "",
        driverName: "",
        driverPhone: "",
        vehicleNumber: "",
        notes: "",
      });
      showToast("הקו נוצר");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createStop() {
    if (!selectedRouteId || !stopForm.name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/transportation/routes/${selectedRouteId}/stops`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stopForm),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || "שגיאה ביצירת תחנה");
        return;
      }
      setStopForm({
        name: "",
        address: "",
        time: "",
        landmark: "",
        mapLink: "",
        notes: "",
      });
      showToast("התחנה נוספה");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function moveStop(stopId: string, direction: -1 | 1) {
    const ordered = [...selectedRouteStops];
    const idx = ordered.findIndex((s) => s._id === stopId);
    const next = idx + direction;
    if (idx < 0 || next < 0 || next >= ordered.length) return;
    const tmp = ordered[idx];
    ordered[idx] = ordered[next];
    ordered[next] = tmp;
    setBusy(true);
    try {
      await fetch(
        `/api/events/${eventId}/transportation/routes/${selectedRouteId}/stops`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedStopIds: ordered.map((s) => s._id) }),
        }
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createRegistration() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/transportation/registrations`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...regForm,
            passengerCount: Number(regForm.passengerCount || 1),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(
          data?.error === "ROUTE_FULL"
            ? "הקו מלא — לא ניתן לרשום נוספים"
            : data?.error || "שגיאה בהרשמה"
        );
        return;
      }
      setRegForm({
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
      showToast("נוסע נרשם");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function patchRegistration(id: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/transportation/registrations/${id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || "שגיאה בעדכון");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function updateRouteStatus(routeId: string, status: string) {
    setBusy(true);
    try {
      await fetch(`/api/events/${eventId}/transportation/routes/${routeId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleSettings(key: "enabled" | "guestRegistrationEnabled") {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/transportation`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: !settings?.[key] }),
      });
      const data = await res.json();
      if (res.ok) setSettings(data.settings);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function exportExcel(mode: string, routeId?: string) {
    const params = new URLSearchParams({ mode });
    if (routeId) params.set("routeId", routeId);
    window.open(
      `/api/events/${eventId}/transportation/export?${params.toString()}`,
      "_blank"
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F6F1EA] p-8 text-center font-black text-[#5a4634]" dir="rtl">
        טוען ניהול הסעות…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#F6F1EA] p-8" dir="rtl">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#eadfce] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#241A14]">ניהול הסעות</h1>
          <p className="mt-3 text-sm text-[#6b6046]">
            המודול אינו פעיל בחשבון זה. פנו לאדמין להפעלת התוסף.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-2xl bg-[#241A2E] px-5 py-3 text-sm font-black text-white"
          >
            חזרה לדשבורד
          </button>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="min-h-screen bg-[#F6F1EA] p-8 text-center" dir="rtl">
        <p className="font-black text-[#5a4634]">חסר מזהה אירוע</p>
      </div>
    );
  }

  if (error === "TRANSPORTATION_NOT_ALLOWED" || error === "UNAUTHORIZED") {
    return (
      <div className="min-h-screen bg-[#F6F1EA] p-8" dir="rtl">
        <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center">
          <h1 className="text-xl font-black text-rose-800">אין הרשאה</h1>
          <p className="mt-2 text-sm text-[#6b6046]">גישה לניהול הסעות חסומה.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "סקירה" },
    { key: "routes", label: "קווים ותחנות" },
    { key: "passengers", label: "נוסעים" },
    { key: "dayof", label: "יום האירוע" },
    { key: "manifest", label: "מניפסט נהג" },
  ];

  return (
    <div className="min-h-screen bg-[#F6F1EA]" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mb-2 text-sm font-bold text-[#8B5E34]"
            >
              ← חזרה לדשבורד
            </button>
            <h1 className="font-serif text-3xl font-black text-[#241A14] md:text-4xl">
              ניהול הסעות
            </h1>
            <p className="mt-1 text-sm text-[#6b6046]">
              קווים, תחנות, הרשמות וניהול חי ביום האירוע
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleSettings("enabled")}
              className={`rounded-2xl border px-4 py-2 text-sm font-black ${
                settings?.enabled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-[#eadfce] bg-white text-[#6b6046]"
              }`}
            >
              {settings?.enabled ? "מודול פעיל" : "מודול כבוי"}
            </button>
            <button
              type="button"
              onClick={() => toggleSettings("guestRegistrationEnabled")}
              className={`rounded-2xl border px-4 py-2 text-sm font-black ${
                settings?.guestRegistrationEnabled
                  ? "border-[#c79a55] bg-[#fff7ea] text-[#5a4634]"
                  : "border-[#eadfce] bg-white text-[#6b6046]"
              }`}
            >
              {settings?.guestRegistrationEnabled
                ? "הרשמת אורחים פתוחה"
                : "הרשמת אורחים סגורה"}
            </button>
            <button
              type="button"
              onClick={() => exportExcel("all")}
              className="rounded-2xl bg-[#241A2E] px-4 py-2 text-sm font-black text-white"
            >
              ייצוא Excel
            </button>
          </div>
        </div>

        {toast && (
          <div className="mb-4 rounded-2xl border border-[#c79a55] bg-[#fff7ea] px-4 py-3 text-sm font-bold text-[#5a4634]">
            {toast}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                tab === t.key
                  ? "bg-[#241A2E] text-white"
                  : "border border-[#eadfce] bg-white text-[#5a4634]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
              {[
                ["קווי הסעה", summary?.routeCount ?? 0],
                ["סך מקומות", summary?.totalSeats ?? 0],
                ["סך נרשמים", summary?.totalRegistered ?? 0],
                ["מקומות פנויים", summary?.remainingSeats ?? 0],
                ["נוסעים בהלוך", summary?.outboundPassengers ?? 0],
                ["נוסעים בחזור", summary?.returnPassengers ?? 0],
                ["בלי הסעה", summary?.guestsWithoutTransportCount ?? 0],
                ["קווים מלאים", summary?.fullRoutes ?? 0],
                ["כמעט מלאים", summary?.almostFullRoutes ?? 0],
                ["חריגות", summary?.issues?.length ?? 0],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-3xl border border-[#eadfce] bg-white p-4 shadow-sm"
                >
                  <div className="text-xs font-bold text-[#9a8771]">{label}</div>
                  <div className="mt-2 text-2xl font-black text-[#241A14]">{value}</div>
                </div>
              ))}
            </div>

            {summary?.issues?.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-black text-amber-900">חריגות / בעיות</h3>
                <ul className="mt-2 space-y-1 text-sm text-amber-900">
                  {summary.issues.map((issue: string) => (
                    <li key={issue}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {(summary?.routes || []).map((r: any) => (
                <div
                  key={r.routeId}
                  className="rounded-3xl border border-[#eadfce] bg-white p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-black text-[#241A14]">{r.name}</div>
                      <div className="text-xs text-[#9a8771]">
                        {DIRECTION_LABEL[r.direction] || r.direction}
                        {r.departureTime ? ` · ${r.departureTime}` : ""}
                      </div>
                    </div>
                    <span className="rounded-full bg-[#F6F1EA] px-3 py-1 text-xs font-bold text-[#5a4634]">
                      {r.status}
                    </span>
                  </div>
                  <CapacityBar
                    registered={r.registered}
                    capacity={r.capacity}
                    level={r.level}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "routes" && (
          <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-[#eadfce] bg-white p-5">
                <h3 className="mb-3 font-black text-[#241A14]">יצירת קו חדש</h3>
                <div className="space-y-2">
                  <input
                    className="w-full rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                    placeholder="שם הקו (לדוגמה: חיפה)"
                    value={routeForm.name}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                  <select
                    className="w-full rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                    value={routeForm.direction}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, direction: e.target.value }))
                    }
                  >
                    <option value="outbound">הלוך</option>
                    <option value="return">חזור</option>
                    <option value="round_trip">הלוך וחזור</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                      placeholder="שעת יציאה"
                      value={routeForm.departureTime}
                      onChange={(e) =>
                        setRouteForm((p) => ({
                          ...p,
                          departureTime: e.target.value,
                        }))
                      }
                    />
                    <input
                      className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                      placeholder="שעת חזרה"
                      value={routeForm.returnTime}
                      onChange={(e) =>
                        setRouteForm((p) => ({
                          ...p,
                          returnTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <input
                    className="w-full rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                    placeholder="קיבולת"
                    value={routeForm.capacity}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, capacity: e.target.value }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                    placeholder="חברת הסעות"
                    value={routeForm.companyName}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, companyName: e.target.value }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                    placeholder="שם נהג"
                    value={routeForm.driverName}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, driverName: e.target.value }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                    placeholder="טלפון נהג"
                    value={routeForm.driverPhone}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, driverPhone: e.target.value }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                    placeholder="מספר אוטובוס"
                    value={routeForm.vehicleNumber}
                    onChange={(e) =>
                      setRouteForm((p) => ({
                        ...p,
                        vehicleNumber: e.target.value,
                      }))
                    }
                  />
                  <textarea
                    className="w-full rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                    placeholder="הערות"
                    value={routeForm.notes}
                    onChange={(e) =>
                      setRouteForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={createRoute}
                    className="w-full rounded-2xl bg-[#8f6437] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    יצירת קו
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {routes.length === 0 && (
                <div className="rounded-3xl border border-dashed border-[#d8c7ad] bg-white/70 p-8 text-center text-sm text-[#6b6046]">
                  עדיין אין קווי הסעה. צרו את הקו הראשון.
                </div>
              )}

              {routes.map((route) => {
                const routeSummary = (summary?.routes || []).find(
                  (r: any) => r.routeId === route._id
                );
                const isSelected = selectedRouteId === route._id;
                return (
                  <div
                    key={route._id}
                    className={`rounded-3xl border bg-white p-5 ${
                      isSelected ? "border-[#c79a55]" : "border-[#eadfce]"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-right"
                      onClick={() => setSelectedRouteId(route._id)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-black text-[#241A14]">
                            {route.name}
                          </div>
                          <div className="text-xs text-[#9a8771]">
                            {DIRECTION_LABEL[route.direction]} · קיבולת{" "}
                            {route.capacity}
                            {route.departureTime
                              ? ` · יציאה ${route.departureTime}`
                              : ""}
                          </div>
                          {(route.driverName || route.companyName) && (
                            <div className="mt-1 text-xs text-[#6b6046]">
                              {route.companyName}
                              {route.driverName ? ` · ${route.driverName}` : ""}
                              {route.driverPhone ? ` · ${route.driverPhone}` : ""}
                            </div>
                          )}
                        </div>
                        {routeSummary && (
                          <div className="w-40">
                            <CapacityBar
                              registered={routeSummary.registered}
                              capacity={routeSummary.capacity}
                              level={routeSummary.level}
                            />
                          </div>
                        )}
                      </div>
                    </button>

                    {isSelected && (
                      <div className="mt-4 border-t border-[#efe4d6] pt-4">
                        <h4 className="mb-2 font-black text-[#241A14]">
                          נקודות איסוף / הורדה
                        </h4>
                        <div className="mb-3 space-y-2">
                          {selectedRouteStops.map((stop, index) => (
                            <div
                              key={stop._id}
                              className="flex items-center justify-between gap-2 rounded-2xl bg-[#FBF7F0] px-3 py-2"
                            >
                              <div>
                                <div className="text-sm font-black text-[#241A14]">
                                  {index + 1}. {stop.name}
                                  {stop.time ? ` · ${stop.time}` : ""}
                                </div>
                                <div className="text-xs text-[#6b6046]">
                                  {stop.address}
                                  {stop.landmark ? ` · ${stop.landmark}` : ""}
                                </div>
                                {stop.mapLink && (
                                  <a
                                    href={stop.mapLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-[#8B5E34]"
                                  >
                                    Waze / מפה
                                  </a>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveStop(stop._id, -1)}
                                  className="rounded-xl border border-[#eadfce] bg-white px-2 py-1 text-xs"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveStop(stop._id, 1)}
                                  className="rounded-xl border border-[#eadfce] bg-white px-2 py-1 text-xs"
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                          ))}
                          {selectedRouteStops.length === 0 && (
                            <p className="text-xs text-[#9a8771]">
                              אין תחנות עדיין לקו זה.
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                            placeholder="שם תחנה"
                            value={stopForm.name}
                            onChange={(e) =>
                              setStopForm((p) => ({ ...p, name: e.target.value }))
                            }
                          />
                          <input
                            className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                            placeholder="שעה"
                            value={stopForm.time}
                            onChange={(e) =>
                              setStopForm((p) => ({ ...p, time: e.target.value }))
                            }
                          />
                          <input
                            className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm md:col-span-2"
                            placeholder="כתובת מלאה"
                            value={stopForm.address}
                            onChange={(e) =>
                              setStopForm((p) => ({
                                ...p,
                                address: e.target.value,
                              }))
                            }
                          />
                          <input
                            className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                            placeholder="landmark / הוראות"
                            value={stopForm.landmark}
                            onChange={(e) =>
                              setStopForm((p) => ({
                                ...p,
                                landmark: e.target.value,
                              }))
                            }
                          />
                          <input
                            className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                            placeholder="קישור Waze/מפה"
                            value={stopForm.mapLink}
                            onChange={(e) =>
                              setStopForm((p) => ({
                                ...p,
                                mapLink: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={createStop}
                          className="mt-3 rounded-2xl bg-[#241A2E] px-4 py-2 text-sm font-black text-white"
                        >
                          הוספת תחנה
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "passengers" && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-[#eadfce] bg-white p-5">
              <h3 className="mb-3 font-black text-[#241A14]">הוספת נוסע ידנית</h3>
              <div className="grid gap-2 md:grid-cols-3">
                <input
                  className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                  placeholder="שם"
                  value={regForm.name}
                  onChange={(e) =>
                    setRegForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                  placeholder="טלפון"
                  value={regForm.phone}
                  onChange={(e) =>
                    setRegForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
                <input
                  className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                  placeholder="כמות נוסעים"
                  value={regForm.passengerCount}
                  onChange={(e) =>
                    setRegForm((p) => ({
                      ...p,
                      passengerCount: e.target.value,
                    }))
                  }
                />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={regForm.needsOutbound}
                    onChange={(e) =>
                      setRegForm((p) => ({
                        ...p,
                        needsOutbound: e.target.checked,
                      }))
                    }
                  />
                  הלוך
                </label>
                <select
                  className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                  value={regForm.outboundRouteId}
                  onChange={(e) =>
                    setRegForm((p) => ({
                      ...p,
                      outboundRouteId: e.target.value,
                      outboundStopId: "",
                    }))
                  }
                >
                  <option value="">קו הלוך</option>
                  {outboundRoutes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                  value={regForm.outboundStopId}
                  onChange={(e) =>
                    setRegForm((p) => ({
                      ...p,
                      outboundStopId: e.target.value,
                    }))
                  }
                >
                  <option value="">תחנת איסוף</option>
                  {stops
                    .filter((s) => s.routeId === regForm.outboundRouteId)
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                        {s.time ? ` (${s.time})` : ""}
                      </option>
                    ))}
                </select>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={regForm.needsReturn}
                    onChange={(e) =>
                      setRegForm((p) => ({
                        ...p,
                        needsReturn: e.target.checked,
                      }))
                    }
                  />
                  חזור
                </label>
                <select
                  className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                  value={regForm.returnRouteId}
                  onChange={(e) =>
                    setRegForm((p) => ({
                      ...p,
                      returnRouteId: e.target.value,
                      returnStopId: "",
                    }))
                  }
                >
                  <option value="">קו/שעת חזור</option>
                  {returnRoutes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                      {r.departureTime ? ` · ${r.departureTime}` : ""}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-[#eadfce] px-3 py-2 text-sm"
                  value={regForm.returnStopId}
                  onChange={(e) =>
                    setRegForm((p) => ({
                      ...p,
                      returnStopId: e.target.value,
                    }))
                  }
                >
                  <option value="">נקודת הורדה</option>
                  {stops
                    .filter((s) => s.routeId === regForm.returnRouteId)
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={createRegistration}
                className="mt-3 rounded-2xl bg-[#8f6437] px-4 py-2 text-sm font-black text-white"
              >
                הוספת נוסע
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[200px] flex-1 rounded-2xl border border-[#eadfce] bg-white px-3 py-2 text-sm"
                placeholder="חיפוש לפי שם / טלפון"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="rounded-2xl border border-[#eadfce] bg-white px-3 py-2 text-sm"
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value)}
              >
                <option value="all">כל הכיוונים</option>
                <option value="outbound">הלוך</option>
                <option value="return">חזור</option>
                <option value="active">פעילים</option>
                <option value="cancelled">מבוטלים</option>
              </select>
              <select
                className="rounded-2xl border border-[#eadfce] bg-white px-3 py-2 text-sm"
                value={filterRouteId}
                onChange={(e) => setFilterRouteId(e.target.value)}
              >
                <option value="all">כל הקווים</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-2xl border border-[#eadfce] bg-white px-3 py-2 text-sm"
                value={filterStopId}
                onChange={(e) => setFilterStopId(e.target.value)}
              >
                <option value="all">כל התחנות</option>
                {stops.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-[#eadfce] bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-[#FBF7F0] text-[#5a4634]">
                  <tr>
                    {[
                      "שם",
                      "טלפון",
                      "כמות",
                      "הלוך",
                      "קו",
                      "תחנה",
                      "שעה",
                      "חזור",
                      "שעת חזור",
                      "הורדה",
                      "סטטוס",
                      "פעולות",
                    ].map((h) => (
                      <th key={h} className="px-3 py-3 text-right font-black">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((r) => {
                    const outRoute = r.outboundRouteId
                      ? routeMap.get(String(r.outboundRouteId))
                      : null;
                    const retRoute = r.returnRouteId
                      ? routeMap.get(String(r.returnRouteId))
                      : null;
                    const outStop = r.outboundStopId
                      ? stopMap.get(String(r.outboundStopId))
                      : null;
                    const retStop = r.returnStopId
                      ? stopMap.get(String(r.returnStopId))
                      : null;
                    return (
                      <tr key={r._id} className="border-t border-[#efe4d6]">
                        <td className="px-3 py-3 font-bold">{r.name}</td>
                        <td className="px-3 py-3">{r.phone}</td>
                        <td className="px-3 py-3">{r.passengerCount}</td>
                        <td className="px-3 py-3">
                          {r.needsOutbound ? "כן" : "לא"}
                        </td>
                        <td className="px-3 py-3">{outRoute?.name || "—"}</td>
                        <td className="px-3 py-3">{outStop?.name || "—"}</td>
                        <td className="px-3 py-3">
                          {outStop?.time || outRoute?.departureTime || "—"}
                        </td>
                        <td className="px-3 py-3">
                          {r.needsReturn ? "כן" : "לא"}
                        </td>
                        <td className="px-3 py-3">
                          {retRoute?.departureTime || retRoute?.returnTime || "—"}
                        </td>
                        <td className="px-3 py-3">{retStop?.name || "—"}</td>
                        <td className="px-3 py-3">
                          {r.status === "cancelled"
                            ? "בוטל"
                            : BOARD_LABEL[r.outboundBoardStatus] ||
                              r.outboundBoardStatus}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            <select
                              className="rounded-xl border border-[#eadfce] px-2 py-1 text-xs"
                              value={String(r.outboundRouteId || "")}
                              onChange={(e) =>
                                patchRegistration(r._id, {
                                  needsOutbound: true,
                                  outboundRouteId: e.target.value,
                                })
                              }
                            >
                              <option value="">העבר קו</option>
                              {outboundRoutes.map((route) => (
                                <option key={route._id} value={route._id}>
                                  {route.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("לבטל הרשמה?")) {
                                  patchRegistration(r._id, {
                                    status: "cancelled",
                                  });
                                }
                              }}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700"
                            >
                              ביטול
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredRegistrations.length === 0 && (
                <div className="p-8 text-center text-sm text-[#9a8771]">
                  אין נוסעים תואמים לסינון.
                </div>
              )}
            </div>

            {guestsWithoutTransport.length > 0 && (
              <div className="rounded-3xl border border-[#eadfce] bg-white p-5">
                <h3 className="font-black text-[#241A14]">
                  אורחים שלא בחרו הסעה ({guestsWithoutTransport.length})
                </h3>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {guestsWithoutTransport.slice(0, 20).map((g) => (
                    <div
                      key={g._id}
                      className="rounded-2xl bg-[#FBF7F0] px-3 py-2 text-sm"
                    >
                      <span className="font-bold">{g.name}</span>
                      {g.phone ? ` · ${g.phone}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "dayof" && (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {routes
                .filter((r) => r.active)
                .map((route) => {
                  const routeRegs = registrations.filter(
                    (reg) =>
                      reg.status === "registered" &&
                      (String(reg.outboundRouteId) === route._id ||
                        String(reg.returnRouteId) === route._id)
                  );
                  const expected = routeRegs.reduce(
                    (s, r) => s + Number(r.passengerCount || 0),
                    0
                  );
                  const boarded = routeRegs
                    .filter((r) => {
                      if (String(r.outboundRouteId) === route._id) {
                        return r.outboundBoardStatus === "boarded";
                      }
                      return r.returnBoardStatus === "boarded";
                    })
                    .reduce((s, r) => s + Number(r.passengerCount || 0), 0);
                  const missing = Math.max(0, expected - boarded);
                  return (
                    <div
                      key={route._id}
                      className="rounded-3xl border border-[#eadfce] bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-[#241A14]">
                            {route.name}
                          </div>
                          <div className="text-xs text-[#9a8771]">
                            {DIRECTION_LABEL[route.direction]}
                            {route.departureTime
                              ? ` · ${route.departureTime}`
                              : ""}
                          </div>
                        </div>
                        <select
                          className="rounded-xl border border-[#eadfce] px-2 py-1 text-xs"
                          value={route.status}
                          onChange={(e) =>
                            updateRouteStatus(route._id, e.target.value)
                          }
                        >
                          <option value="scheduled">ממתין</option>
                          <option value="boarding">עלייה</option>
                          <option value="departed">יצא</option>
                          <option value="completed">הסתיים</option>
                          <option value="cancelled">בוטל</option>
                        </select>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-[#FBF7F0] p-3">
                          <div className="text-xs text-[#9a8771]">צפויים</div>
                          <div className="text-xl font-black">{expected}</div>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-3">
                          <div className="text-xs text-emerald-700">עלו</div>
                          <div className="text-xl font-black text-emerald-800">
                            {boarded}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-rose-50 p-3">
                          <div className="text-xs text-rose-700">חסרים</div>
                          <div className="text-xl font-black text-rose-800">
                            {missing}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {stops
                          .filter((s) => s.routeId === route._id)
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((stop) => {
                            const stopExpected = routeRegs
                              .filter(
                                (r) =>
                                  String(r.outboundStopId) === stop._id ||
                                  String(r.returnStopId) === stop._id
                              )
                              .reduce(
                                (s, r) => s + Number(r.passengerCount || 0),
                                0
                              );
                            const stopBoarded = routeRegs
                              .filter((r) => {
                                if (String(r.outboundStopId) === stop._id) {
                                  return r.outboundBoardStatus === "boarded";
                                }
                                if (String(r.returnStopId) === stop._id) {
                                  return r.returnBoardStatus === "boarded";
                                }
                                return false;
                              })
                              .reduce(
                                (s, r) => s + Number(r.passengerCount || 0),
                                0
                              );
                            return (
                              <div
                                key={stop._id}
                                className="flex items-center justify-between rounded-2xl bg-[#FBF7F0] px-3 py-2 text-sm"
                              >
                                <span className="font-bold">{stop.name}</span>
                                <span className="text-xs text-[#6b6046]">
                                  {stopExpected} צפויים · {stopBoarded} עלו ·{" "}
                                  {Math.max(0, stopExpected - stopBoarded)} חסרים
                                </span>
                              </div>
                            );
                          })}
                      </div>

                      <div className="mt-4 space-y-2">
                        {routeRegs.map((reg) => {
                          const isOutbound =
                            String(reg.outboundRouteId) === route._id;
                          const boardStatus = isOutbound
                            ? reg.outboundBoardStatus
                            : reg.returnBoardStatus;
                          return (
                            <div
                              key={reg._id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#efe4d6] px-3 py-2"
                            >
                              <div className="text-sm">
                                <span className="font-black">{reg.name}</span>
                                <span className="text-[#9a8771]">
                                  {" "}
                                  · {reg.passengerCount} · {reg.phone}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchRegistration(reg._id, {
                                      [isOutbound
                                        ? "outboundBoardStatus"
                                        : "returnBoardStatus"]: "boarded",
                                    })
                                  }
                                  className={`rounded-xl px-2 py-1 text-xs font-bold ${
                                    boardStatus === "boarded"
                                      ? "bg-emerald-600 text-white"
                                      : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                  }`}
                                >
                                  עלה
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchRegistration(reg._id, {
                                      [isOutbound
                                        ? "outboundBoardStatus"
                                        : "returnBoardStatus"]: "no_show",
                                    })
                                  }
                                  className={`rounded-xl px-2 py-1 text-xs font-bold ${
                                    boardStatus === "no_show"
                                      ? "bg-rose-600 text-white"
                                      : "border border-rose-200 bg-rose-50 text-rose-800"
                                  }`}
                                >
                                  חסר
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {tab === "manifest" && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {routes.map((r) => (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => setSelectedRouteId(r._id)}
                  className={`rounded-2xl px-4 py-2 text-sm font-black ${
                    selectedRouteId === r._id
                      ? "bg-[#241A2E] text-white"
                      : "border border-[#eadfce] bg-white"
                  }`}
                >
                  {r.name}
                </button>
              ))}
              {selectedRouteId && (
                <button
                  type="button"
                  onClick={() => exportExcel("manifest", selectedRouteId)}
                  className="rounded-2xl bg-[#8f6437] px-4 py-2 text-sm font-black text-white"
                >
                  ייצוא מניפסט
                </button>
              )}
            </div>

            {selectedRouteId && (
              <div className="rounded-3xl border border-[#eadfce] bg-white p-5">
                {(() => {
                  const route = routeMap.get(selectedRouteId);
                  if (!route) return null;
                  const routeStops = stops
                    .filter((s) => s.routeId === selectedRouteId)
                    .sort((a, b) => a.sortOrder - b.sortOrder);
                  const routeRegs = registrations.filter(
                    (r) =>
                      r.status === "registered" &&
                      (String(r.outboundRouteId) === selectedRouteId ||
                        String(r.returnRouteId) === selectedRouteId)
                  );
                  return (
                    <>
                      <h3 className="text-xl font-black text-[#241A14]">
                        Passenger Manifest — {route.name}
                      </h3>
                      <p className="text-sm text-[#6b6046]">
                        {DIRECTION_LABEL[route.direction]}
                        {route.departureTime
                          ? ` · יציאה ${route.departureTime}`
                          : ""}
                        {route.driverName ? ` · נהג ${route.driverName}` : ""}
                        {route.vehicleNumber
                          ? ` · רכב ${route.vehicleNumber}`
                          : ""}
                      </p>

                      {routeStops.map((stop) => {
                        const stopRegs = routeRegs.filter(
                          (r) =>
                            String(r.outboundStopId) === stop._id ||
                            String(r.returnStopId) === stop._id
                        );
                        return (
                          <div key={stop._id} className="mt-5">
                            <div className="mb-2 font-black text-[#241A14]">
                              {stop.name}
                              {stop.time ? ` · ${stop.time}` : ""}
                            </div>
                            <div className="space-y-2">
                              {stopRegs.map((reg) => {
                                const isOutbound =
                                  String(reg.outboundRouteId) ===
                                  selectedRouteId;
                                const boarded = isOutbound
                                  ? reg.outboundBoardStatus === "boarded"
                                  : reg.returnBoardStatus === "boarded";
                                return (
                                  <div
                                    key={reg._id}
                                    className="flex items-center justify-between rounded-2xl bg-[#FBF7F0] px-3 py-2 text-sm"
                                  >
                                    <div>
                                      <span className="font-black">
                                        {reg.name}
                                      </span>
                                      <span className="text-[#9a8771]">
                                        {" "}
                                        · {reg.phone} · {reg.passengerCount}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        patchRegistration(reg._id, {
                                          [isOutbound
                                            ? "outboundBoardStatus"
                                            : "returnBoardStatus"]: boarded
                                            ? "registered"
                                            : "boarded",
                                        })
                                      }
                                      className={`rounded-xl px-3 py-1 text-xs font-black ${
                                        boarded
                                          ? "bg-emerald-600 text-white"
                                          : "border border-[#eadfce] bg-white"
                                      }`}
                                    >
                                      {boarded ? "YES" : "NO"}
                                    </button>
                                  </div>
                                );
                              })}
                              {stopRegs.length === 0 && (
                                <p className="text-xs text-[#9a8771]">
                                  אין נוסעים בתחנה זו
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

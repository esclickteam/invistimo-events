"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TimeField from "./TimeField";
import RouteWorkspace from "./RouteWorkspace";
import "./transport.css";

type TabKey =
  | "overview"
  | "routes"
  | "passengers"
  | "waitlist"
  | "dayof"
  | "returns"
  | "manifest";

type CapacityLevel = "available" | "filling" | "almost_full" | "full";
type LegacyCapacityLevel = "ok" | "warning_80" | "warning_90" | "full";

type RouteRow = {
  _id: string;
  name: string;
  direction: "outbound" | "return" | "round_trip";
  departureTime?: string;
  returnTime?: string;
  capacity: number;
  returnCapacity?: number;
  reservedSeats?: number;
  returnReservedSeats?: number;
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

type RegistrationStatus = "registered" | "waitlisted" | "cancelled" | "rejected";

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
  status: RegistrationStatus | string;
  outboundBoardStatus: string;
  returnBoardStatus: string;
  invitationGuestId?: string | null;
  createdAt?: string;
};

type RouteSummary = {
  routeId: string;
  name: string;
  direction: string;
  capacity: number;
  registered: number;
  remaining: number;
  returnCapacity?: number;
  returnRegistered?: number;
  returnRemaining?: number;
  level?: CapacityLevel;
  returnLevel?: CapacityLevel;
  legacyLevel?: LegacyCapacityLevel;
  active?: boolean;
  status?: string;
  departureTime?: string;
  returnTime?: string;
  waitlistedCount?: number;
  waitlistedPassengers?: number;
  stopCount?: number;
  companyName?: string;
  driverName?: string;
  vehicleNumber?: string;
};

type WaitlistOpportunity = {
  routeId: string;
  name: string;
  remaining: number;
  waitlistedCount: number;
  waitlistedPassengers: number;
  message: string;
};

type SummaryShape = {
  routeCount?: number;
  totalSeats?: number;
  totalRegistered?: number;
  remainingSeats?: number;
  outboundPassengers?: number;
  returnPassengers?: number;
  waitlistedCount?: number;
  waitlistedPassengers?: number;
  guestsWithoutTransportCount?: number;
  issues?: string[];
  waitlistOpportunities?: WaitlistOpportunity[];
  routes?: RouteSummary[];
  stops?: Array<{
    stopId: string;
    routeId: string;
    name: string;
    time?: string;
    expected: number;
    boarded: number;
    missing: number;
  }>;
  waitlist?: RegistrationRow[];
};

const DIRECTION_LABEL: Record<string, string> = {
  outbound: "הלוך",
  return: "חזור",
  round_trip: "הלוך וחזור",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "מתוכנן",
  boarding: "בעלייה",
  departed: "יצא",
  completed: "הושלם",
  cancelled: "בוטל",
};

const BOARD_LABEL: Record<string, string> = {
  registered: "ממתין",
  checked_in: "צ׳ק־אין",
  boarded: "עלה",
  no_show: "חסר",
  cancelled: "בוטל",
  not_needed: "לא נדרש",
};

const REG_STATUS_LABEL: Record<string, string> = {
  registered: "רשום",
  waitlisted: "בהמתנה",
  cancelled: "בוטל",
  rejected: "נדחה",
};

const LEVEL_LABEL: Record<CapacityLevel, string> = {
  available: "זמין",
  filling: "מתמלא",
  almost_full: "כמעט מלא",
  full: "מלא",
};

const RING_COLOR: Record<CapacityLevel, string> = {
  available: "#6fd3a8",
  filling: "#e0b35a",
  almost_full: "#e0895a",
  full: "#e06b6b",
};

function id(value: unknown) {
  return value ? String(value) : "";
}

function normalizeLevel(level?: string, legacyLevel?: string): CapacityLevel {
  if (
    level === "available" ||
    level === "filling" ||
    level === "almost_full" ||
    level === "full"
  ) {
    return level;
  }
  if (legacyLevel === "full") return "full";
  if (legacyLevel === "warning_90") return "almost_full";
  if (legacyLevel === "warning_80") return "filling";
  return "available";
}

function pct(registered = 0, capacity = 0) {
  if (capacity <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((registered / capacity) * 100)));
}

function routeClock(route?: Pick<RouteRow, "departureTime" | "returnTime"> | RouteSummary | null) {
  if (!route) return "";
  return route.departureTime || route.returnTime || "";
}

function isOutboundRoute(route: RouteRow) {
  return route.active && (route.direction === "outbound" || route.direction === "round_trip");
}

function isReturnRoute(route: RouteRow) {
  return route.active && (route.direction === "return" || route.direction === "round_trip");
}

function CapacityRing({
  registered,
  capacity,
  level,
}: {
  registered: number;
  capacity: number;
  level: CapacityLevel;
}) {
  const value = pct(registered, capacity);
  return (
    <div
      className="tx-ring"
      style={
        {
          "--pct": value,
          "--ring": RING_COLOR[level],
        } as CSSProperties
      }
      aria-label={`ניצול קיבולת ${value}%`}
    >
      <span>{value}%</span>
    </div>
  );
}

function CapacityChip({
  level,
  legacyLevel,
}: {
  level?: string;
  legacyLevel?: string;
}) {
  const normalized = normalizeLevel(level, legacyLevel);
  return <span className={`tx-chip ${normalized}`}>{LEVEL_LABEL[normalized]}</span>;
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="tx-stat">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-[#66768a]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-[#1c2430]">{value}</div>
      {hint ? <div className="mt-1 text-xs text-[#66768a]">{hint}</div> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d7e0ec] bg-white/80 p-8 text-center text-sm font-bold text-[#66768a]">
      {text}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [summary, setSummary] = useState<SummaryShape | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [guestsWithoutTransport, setGuestsWithoutTransport] = useState<any[]>([]);

  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [routeListFilter, setRouteListFilter] = useState<
    "all" | "outbound" | "return" | "round_trip"
  >("all");
  const [search, setSearch] = useState("");
  const [filterDirection, setFilterDirection] = useState("all");
  const [filterRouteId, setFilterRouteId] = useState("all");
  const [filterStopId, setFilterStopId] = useState("all");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const [routeForm, setRouteForm] = useState({
    name: "",
    direction: "outbound" as "outbound" | "return" | "round_trip",
    departureTime: "",
    returnTime: "",
    capacity: "50",
    returnCapacity: "50",
    companyName: "",
    driverName: "",
    driverPhone: "",
    vehicleNumber: "",
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
    waitlist: false,
  });

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

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
        return;
      }
      setSettings(data.settings);
      setSummary(data.summary || null);
      setRoutes(data.routes || []);
      setStops(data.stops || []);
      setRegistrations(data.registrations || []);
      setGuestsWithoutTransport(data.guestsWithoutTransport || []);
      setSelectedRouteId((current) => current || data.routes?.[0]?._id || "");
    } catch {
      setError("LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (authLoading || !canAccess || !eventId) return;
    load();
  }, [authLoading, canAccess, eventId, load]);

  const routeMap = useMemo(() => new Map(routes.map((r) => [id(r._id), r])), [routes]);
  const stopMap = useMemo(() => new Map(stops.map((s) => [id(s._id), s])), [stops]);
  const summaryRouteMap = useMemo(
    () => new Map((summary?.routes || []).map((r) => [id(r.routeId), r])),
    [summary?.routes]
  );

  const activeRoutes = useMemo(() => routes.filter((r) => r.active), [routes]);
  const outboundRoutes = useMemo(() => routes.filter(isOutboundRoute), [routes]);
  const returnRoutes = useMemo(() => routes.filter(isReturnRoute), [routes]);
  const waitlistRows = useMemo(
    () =>
      (summary?.waitlist?.length ? summary.waitlist : registrations.filter((r) => r.status === "waitlisted")) || [],
    [registrations, summary?.waitlist]
  );

  const filteredRoutes = useMemo(() => {
    if (routeListFilter === "all") return routes;
    return routes.filter((r) => r.direction === routeListFilter);
  }, [routeListFilter, routes]);

  const selectedRoute = useMemo(
    () => routes.find((r) => id(r._id) === selectedRouteId) || null,
    [routes, selectedRouteId]
  );

  const filteredRegistrations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((r) => {
      if (q) {
        const haystack = `${r.name} ${r.phone || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterDirection === "outbound" && !r.needsOutbound) return false;
      if (filterDirection === "return" && !r.needsReturn) return false;
      if (filterDirection === "active" && r.status !== "registered") return false;
      if (filterDirection === "waitlisted" && r.status !== "waitlisted") return false;
      if (filterDirection === "cancelled" && r.status !== "cancelled") return false;
      if (filterRouteId !== "all") {
        if (id(r.outboundRouteId) !== filterRouteId && id(r.returnRouteId) !== filterRouteId) {
          return false;
        }
      }
      if (filterStopId !== "all") {
        if (id(r.outboundStopId) !== filterStopId && id(r.returnStopId) !== filterStopId) {
          return false;
        }
      }
      return true;
    });
  }, [filterDirection, filterRouteId, filterStopId, registrations, search]);

  const resetRegistrationForm = () =>
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
      waitlist: false,
    });

  const routeStops = useCallback(
    (routeId: string) =>
      stops
        .filter((s) => id(s.routeId) === routeId)
        .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)),
    [stops]
  );

  const routeRegistrations = useCallback(
    (routeId: string) =>
      registrations.filter(
        (reg) =>
          reg.status === "registered" &&
          (id(reg.outboundRouteId) === routeId || id(reg.returnRouteId) === routeId)
      ),
    [registrations]
  );

  function routeBoardField(route: RouteRow, reg: RegistrationRow) {
    if (route.direction === "return") return "returnBoardStatus";
    if (id(reg.outboundRouteId) === id(route._id)) return "outboundBoardStatus";
    return "returnBoardStatus";
  }

  function remainingForRegistration(reg: RegistrationRow) {
    const values: number[] = [];
    if (reg.needsOutbound && reg.outboundRouteId) {
      values.push(summaryRouteMap.get(id(reg.outboundRouteId))?.remaining ?? 0);
    }
    if (reg.needsReturn && reg.returnRouteId) {
      const summary = summaryRouteMap.get(id(reg.returnRouteId));
      const remaining =
        summary?.direction === "round_trip"
          ? summary.returnRemaining ?? summary.remaining ?? 0
          : summary?.remaining ?? 0;
      values.push(remaining);
    }
    return values.length ? Math.min(...values) : 0;
  }

  async function createRoute() {
    if (!routeForm.name.trim()) {
      showToast("שם הקו נדרש");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/transportation/routes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...routeForm,
          capacity: Number(routeForm.capacity || 50),
          returnCapacity: Number(routeForm.returnCapacity || routeForm.capacity || 50),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error || "שגיאה ביצירת קו");
        return;
      }
      const createdId = data?.route?._id ? id(data.route._id) : "";
      setRouteForm({
        name: "",
        direction: "outbound",
        departureTime: "",
        returnTime: "",
        capacity: "50",
        returnCapacity: "50",
        companyName: "",
        driverName: "",
        driverPhone: "",
        vehicleNumber: "",
        notes: "",
      });
      if (createdId) setSelectedRouteId(createdId);
      showToast("קו חדש נפתח — עכשיו הוסיפו תחנות במסלול");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function moveRoute(routeId: string, direction: -1 | 1) {
    const ordered = [...routes].sort(
      (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)
    );
    const index = ordered.findIndex((r) => id(r._id) === routeId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const current = ordered[index];
    const next = ordered[nextIndex];
    setBusy(true);
    try {
      await Promise.all([
        fetch(`/api/events/${eventId}/transportation/routes/${current._id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: nextIndex }),
        }),
        fetch(`/api/events/${eventId}/transportation/routes/${next._id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: index }),
        }),
      ]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createRegistration() {
    if (!regForm.name.trim()) {
      showToast("שם נוסע נדרש");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/transportation/registrations`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...regForm,
          passengerCount: Number(regForm.passengerCount || 1),
          waitlist: regForm.waitlist,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error === "ROUTE_FULL") {
          showToast(
            data?.waitlistAvailable
              ? "הקו מלא. אפשר לסמן הוספה לרשימת המתנה ולשמור מחדש."
              : "הקו מלא — לא ניתן לרשום נוספים."
          );
        } else {
          showToast(data?.error || "שגיאה בהרשמה");
        }
        return;
      }
      resetRegistrationForm();
      showToast(data?.waitlisted ? "הנוסע נוסף לרשימת המתנה" : "הנוסע שובץ להסעה");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function patchRegistration(idToPatch: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/transportation/registrations/${idToPatch}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error === "ROUTE_FULL") {
          showToast(
            data?.remaining !== undefined
              ? `אין מספיק מקומות: נותרו ${data.remaining}, נדרשים ${data.requested || "יותר"}`
              : "אין מספיק מקומות בקו"
          );
        } else {
          showToast(data?.error || "שגיאה בעדכון");
        }
        return;
      }
      if (data?.promoted) showToast("נוסע קודם מרשימת ההמתנה");
      else if (body.action === "reject") showToast("בקשת המתנה נדחתה");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function updateRouteStatus(routeId: string, status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/transportation/routes/${routeId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) showToast("לא הצלחנו לעדכן סטטוס קו");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleSettings(
    key: "enabled" | "guestRegistrationEnabled" | "waitlistEnabled"
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/transportation`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: !settings?.[key] }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) setSettings(data.settings);
      else showToast(data?.error || "שגיאה בעדכון הגדרות");
      await load();
    } finally {
      setBusy(false);
    }
  }

  function exportExcel(mode: string, routeId?: string) {
    const params = new URLSearchParams({ mode });
    if (routeId) params.set("routeId", routeId);
    window.open(`/api/events/${eventId}/transportation/export?${params.toString()}`, "_blank");
  }

  const tabs: { key: TabKey; label: string; hint: string }[] = [
    { key: "overview", label: "סקירה", hint: "פיקוד" },
    { key: "routes", label: "קווים", hint: "תכנון" },
    { key: "passengers", label: "נוסעים", hint: "רישום" },
    { key: "waitlist", label: "המתנה", hint: "אישורים" },
    { key: "dayof", label: "יום האירוע", hint: "חי" },
    { key: "returns", label: "חזור", hint: "לוח יציאות" },
    { key: "manifest", label: "מניפסט", hint: "נהגים" },
  ];

  if (authLoading) {
    return (
      <div className="tx-root grid place-items-center p-8" dir="rtl">
        <div className="tx-hero text-center">
          <div className="tx-live mx-auto mb-4" />
          <div className="text-xl font-black">מאמתים הרשאות למרכז ההסעות...</div>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="tx-root grid place-items-center p-6" dir="rtl">
        <div className="tx-hero max-w-xl text-center">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-[#d4a35c]">
            Access denied
          </div>
          <h1 className="mt-3 text-3xl font-black">מודול ההסעות אינו פעיל</h1>
          <p className="mt-3 text-sm text-[#66768a]">
            אין לחשבון הנוכחי הרשאה לניהול הסעות. ניתן לפנות לאדמין להפעלת המודול.
          </p>
          <button type="button" onClick={() => router.push("/dashboard")} className="tx-btn primary mt-6">
            חזרה לדשבורד
          </button>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="tx-root grid place-items-center p-6" dir="rtl">
        <div className="tx-hero max-w-xl text-center">
          <h1 className="text-2xl font-black">חסר מזהה אירוע</h1>
          <p className="mt-2 text-sm text-[#66768a]">פתחו את מרכז ההסעות מתוך אירוע פעיל.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tx-root grid place-items-center p-8" dir="rtl">
        <div className="tx-hero text-center">
          <div className="tx-live mx-auto mb-4" />
          <div className="text-xl font-black">טוען תמונת מצב לוגיסטית...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-root" dir="rtl">
      <main className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-8">
        <section className="tx-hero">
          <div className="relative z-[1]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="tx-btn primary mb-4"
                >
                  ← חזרה לדשבורד
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tx-chip available">
                    <span className="tx-live" />
                    Control Center Live
                  </span>
                  <span className="tx-chip filling">RTL Logistics</span>
                </div>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1c2430] md:text-6xl">
                  הסעות לאירוע
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66768a] md:text-base">
                  מרכז פיקוד פרימיום לקווים, תחנות, קיבולת, רשימות המתנה וניהול עלייה בזמן אמת.
                </p>
              </div>

              <div className="min-w-[220px] rounded-[24px] border border-[#d7e0ec] bg-white p-5 text-center">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-[#66768a]">
                  Total registered
                </div>
                <div className="mt-2 text-5xl font-black text-[#d4a35c]">
                  {summary?.totalRegistered ?? 0}
                </div>
                <div className="mt-1 text-xs text-[#66768a]">
                  {summary?.outboundPassengers ?? 0} הלוך · {summary?.returnPassengers ?? 0} חזור
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="קווים פעילים" value={summary?.routeCount ?? activeRoutes.length} hint="מסלולים פתוחים" />
              <Metric label="מקומות פנויים" value={summary?.remainingSeats ?? 0} hint={`${summary?.totalSeats ?? 0} מושבים בסך הכל`} />
              <Metric label="בהמתנה" value={summary?.waitlistedPassengers ?? summary?.waitlistedCount ?? 0} hint={`${summary?.waitlistedCount ?? 0} בקשות`} />
              <Metric label="חריגות" value={summary?.issues?.length ?? 0} hint="קווים מלאים / כמעט מלאים" />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`tx-tab ${tab === item.key ? "active" : ""}`}
                  >
                    {item.label}
                    <span className="mr-2 text-[10px] opacity-70">{item.hint}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleSettings("enabled")}
                  className={`tx-btn ${settings?.enabled ? "primary" : ""}`}
                >
                  {settings?.enabled ? "המודול פעיל" : "המודול כבוי"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleSettings("guestRegistrationEnabled")}
                  className={`tx-btn ${settings?.guestRegistrationEnabled ? "primary" : ""}`}
                >
                  {settings?.guestRegistrationEnabled ? "אורחים פתוח" : "אורחים סגור"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleSettings("waitlistEnabled")}
                  className={`tx-btn ${settings?.waitlistEnabled ? "primary" : ""}`}
                >
                  {settings?.waitlistEnabled ? "המתנה פעילה" : "המתנה כבויה"}
                </button>
                <button type="button" onClick={() => exportExcel("all")} className="tx-btn">
                  ייצוא Excel
                </button>
              </div>
            </div>
          </div>
        </section>

        {toast ? (
          <div className="mt-4 rounded-[20px] border border-[#d4a35c]/35 bg-[#d4a35c]/12 px-4 py-3 text-sm font-black text-[#8a6a16]">
            {toast}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-[20px] border border-[#c45b5b]/35 bg-[#c45b5b]/10 px-4 py-3 text-sm font-black text-[#9a3030]">
            {error === "TRANSPORTATION_NOT_ALLOWED" || error === "UNAUTHORIZED"
              ? "אין הרשאה לגשת לניהול ההסעות."
              : "לא הצלחנו לטעון את מרכז ההסעות."}
          </div>
        ) : null}

        <div className="mt-6">
          {tab === "overview" && (
            <section className="space-y-5">
              {(summary?.waitlistOpportunities || []).length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {(summary?.waitlistOpportunities || []).map((item) => (
                    <div
                      key={item.routeId}
                      className="rounded-[22px] border border-[#5ec4a8]/30 bg-[#5ec4a8]/10 p-4"
                    >
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#2f9d78]">
                        הזדמנות מרשימת המתנה
                      </div>
                      <div className="mt-2 text-lg font-black text-[#1c2430]">{item.message}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRouteId(item.routeId);
                          setTab("waitlist");
                        }}
                        className="tx-btn primary mt-3"
                      >
                        בדיקת מועמדים
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {(summary?.issues || []).length > 0 ? (
                <div className="rounded-[24px] border border-[#e0b35a]/35 bg-[#e0b35a]/10 p-5">
                  <div className="text-lg font-black text-[#8a6a16]">חריגות תפעוליות</div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(summary?.issues || []).map((issue) => (
                      <div key={issue} className="rounded-2xl bg-[#f7f9fc] px-3 py-2 text-sm text-[#8a6a16]">
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                {(summary?.routes || []).map((r) => {
                  const route = routeMap.get(id(r.routeId));
                  const stopsForRoute = routeStops(id(r.routeId)).slice(0, 5);
                  const level = normalizeLevel(r.level, r.legacyLevel);
                  return (
                    <article key={r.routeId} className="tx-route-card">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CapacityChip level={r.level} legacyLevel={r.legacyLevel} />
                            {Number(r.waitlistedPassengers || 0) > 0 ? (
                              <span className="tx-chip full">+{r.waitlistedPassengers} בהמתנה</span>
                            ) : null}
                            <span className="tx-chip">{STATUS_LABEL[r.status || ""] || r.status || "פעיל"}</span>
                          </div>
                          <div className="mt-2">
                            <span className={`tx-dir-badge ${r.direction}`}>
                              {DIRECTION_LABEL[r.direction] || r.direction}
                            </span>
                          </div>
                          <h2 className="mt-3 text-2xl font-black text-[#1c2430]">{r.name}</h2>
                          <p className="mt-1 text-sm text-[#66768a]">
                            {DIRECTION_LABEL[r.direction] || r.direction}
                            {routeClock(r) ? ` · ${routeClock(r)}` : ""}
                            {r.driverName ? ` · נהג ${r.driverName}` : ""}
                            {r.vehicleNumber ? ` · רכב ${r.vehicleNumber}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <CapacityRing registered={r.registered} capacity={r.capacity} level={level} />
                          <div className="text-sm">
                            <div className="font-black text-[#1c2430]">
                              {r.registered}/{r.capacity}
                            </div>
                            <div className="text-[#66768a]">{r.remaining} פנויים</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 tx-timeline">
                        {stopsForRoute.map((stop, index) => (
                          <div key={stop._id} className={`tx-stop ${index === stopsForRoute.length - 1 ? "is-venue" : ""}`}>
                            <div className="text-sm font-black text-[#1c2430]">
                              {stop.name}
                              {stop.time ? ` · ${stop.time}` : ""}
                            </div>
                            <div className="text-xs text-[#66768a]">
                              {stop.address || stop.landmark || "נקודה לוגיסטית"}
                            </div>
                          </div>
                        ))}
                        {stopsForRoute.length === 0 ? (
                          <div className="text-sm font-bold text-[#66768a]">אין תחנות מוגדרות לקו זה.</div>
                        ) : null}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRouteId(id(r.routeId));
                            setTab("dayof");
                          }}
                          className="tx-btn primary"
                        >
                          ניהול עלייה
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRouteId(id(r.routeId));
                            setTab("routes");
                          }}
                          className="tx-btn"
                        >
                          תחנות וקיבולת
                        </button>
                        <button type="button" onClick={() => exportExcel("manifest", id(r.routeId))} className="tx-btn">
                          מניפסט נהג
                        </button>
                        {route ? (
                          <button
                            type="button"
                            onClick={() => updateRouteStatus(route._id, route.status === "boarding" ? "departed" : "boarding")}
                            className="tx-btn"
                          >
                            {route.status === "boarding" ? "סמן יצא" : "פתח עלייה"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              {(summary?.routes || []).length === 0 ? <EmptyState text="אין עדיין קווי הסעה. עברו לטאב קווים ופתחו את הקו הראשון." /> : null}
            </section>
          )}

          {tab === "routes" && (
            <section className="space-y-5">
              <div className="tx-segment">
                {(
                  [
                    ["all", "הכל"],
                    ["outbound", "הלוך"],
                    ["return", "חזור"],
                    ["round_trip", "הלוך וחזור"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={routeListFilter === value ? "active" : ""}
                    onClick={() => setRouteListFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
                <aside className="space-y-4">
                  <div className="tx-route-card h-fit">
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-[#b8893f]">
                      קו חדש
                    </div>
                    <h2 className="mt-2 text-2xl font-black text-[#1c2430]">יצירת קו</h2>
                    <p className="mt-2 text-sm text-[#66768a]">
                      קודם יוצרים קו, ואז בתוך הקו בונים את המסלול והתחנות.
                    </p>
                    <div className="mt-5 space-y-3">
                      <input
                        className="tx-input"
                        placeholder="שם הקו"
                        value={routeForm.name}
                        onChange={(e) => setRouteForm((p) => ({ ...p, name: e.target.value }))}
                      />
                      <div className="tx-segment">
                        {(
                          [
                            ["outbound", "הלוך"],
                            ["return", "חזור"],
                            ["round_trip", "הלוך+חזור"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            className={routeForm.direction === value ? "active" : ""}
                            onClick={() => setRouteForm((p) => ({ ...p, direction: value }))}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <TimeField
                        label="שעת יציאה"
                        value={routeForm.departureTime}
                        onChange={(departureTime) => setRouteForm((p) => ({ ...p, departureTime }))}
                        placeholder="08:00"
                        hint="ליציאה להלוך"
                      />
                      {(routeForm.direction === "return" || routeForm.direction === "round_trip") && (
                        <TimeField
                          label="שעת חזרה"
                          value={routeForm.returnTime}
                          onChange={(returnTime) => setRouteForm((p) => ({ ...p, returnTime }))}
                          placeholder="00:30"
                          hint="לקו חזור / הלוך וחזור"
                        />
                      )}
                      <input
                        className="tx-input"
                        inputMode="numeric"
                        placeholder={routeForm.direction === "round_trip" ? "קיבולת הלוך" : "קיבולת"}
                        value={routeForm.capacity}
                        onChange={(e) => setRouteForm((p) => ({ ...p, capacity: e.target.value }))}
                      />
                      {routeForm.direction === "round_trip" ? (
                        <input
                          className="tx-input"
                          inputMode="numeric"
                          placeholder="קיבולת חזור"
                          value={routeForm.returnCapacity}
                          onChange={(e) =>
                            setRouteForm((p) => ({ ...p, returnCapacity: e.target.value }))
                          }
                        />
                      ) : null}
                      <input
                        className="tx-input"
                        placeholder="חברת הסעות"
                        value={routeForm.companyName}
                        onChange={(e) => setRouteForm((p) => ({ ...p, companyName: e.target.value }))}
                      />
                      <button type="button" disabled={busy} onClick={createRoute} className="tx-btn primary w-full">
                        פתיחת קו
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredRoutes.map((route, index) => {
                      const rSummary = summaryRouteMap.get(id(route._id));
                      const selected = selectedRouteId === id(route._id);
                      return (
                        <article
                          key={route._id}
                          className={`tx-route-card w-full text-right ${selected ? "is-selected" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedRouteId(id(route._id))}
                            className="w-full text-right"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`tx-dir-badge ${route.direction}`}>
                                {DIRECTION_LABEL[route.direction]}
                              </span>
                              <CapacityChip level={rSummary?.level} legacyLevel={rSummary?.legacyLevel} />
                            </div>
                            <div className="mt-2 text-xl font-black text-[#1c2430]">{route.name}</div>
                            <div className="mt-1 text-xs font-bold text-[#66768a]">
                              {route.direction === "round_trip"
                                ? `הלוך ${route.departureTime || "—"} · חזור ${route.returnTime || "—"}`
                                : routeClock(route) || "ללא שעה"}
                              {" · "}
                              {rSummary?.stopCount ?? routeStops(id(route._id)).length} תחנות
                              {" · "}
                              {rSummary
                                ? route.direction === "round_trip"
                                  ? `${rSummary.registered + (rSummary.returnRegistered || 0)} רשומים`
                                  : `${rSummary.registered} רשומים`
                                : `${route.capacity} מקומות`}
                            </div>
                          </button>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="tx-btn"
                              disabled={busy || index === 0}
                              onClick={() => moveRoute(route._id, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="tx-btn"
                              disabled={busy || index === filteredRoutes.length - 1}
                              onClick={() => moveRoute(route._id, 1)}
                            >
                              ↓
                            </button>
                            <span className="self-center text-xs font-bold text-[#66768a]">
                              #{index + 1}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                    {filteredRoutes.length === 0 ? (
                      <EmptyState text="אין קווים בסינון הזה. צרו קו חדש מצד שמאל." />
                    ) : null}
                  </div>
                </aside>

                <div>
                  {selectedRoute ? (
                    <RouteWorkspace
                      eventId={eventId}
                      route={selectedRoute}
                      summary={summaryRouteMap.get(id(selectedRoute._id)) || null}
                      stops={routeStops(id(selectedRoute._id))}
                      stopSummaries={(summary?.stops || []).filter(
                        (s) => id(s.routeId) === id(selectedRoute._id)
                      )}
                      registrations={registrations}
                      busy={busy}
                      onReload={load}
                      onToast={showToast}
                      onPatchRegistration={patchRegistration}
                      onUpdateStatus={updateRouteStatus}
                    />
                  ) : (
                    <EmptyState text="בחרו קו מהרשימה או צרו קו חדש כדי לבנות מסלול." />
                  )}
                </div>
              </div>
            </section>
          )}

          {tab === "passengers" && (
            <section className="space-y-5">
              <div className="tx-route-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-[#d4a35c]">Passenger Desk</div>
                    <h2 className="mt-2 text-2xl font-black text-[#1c2430]">הוספת נוסע ידנית</h2>
                  </div>
                  <label className="tx-chip filling cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.waitlist}
                      onChange={(e) => setRegForm((p) => ({ ...p, waitlist: e.target.checked }))}
                    />
                    הוסף לרשימת המתנה
                  </label>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <input className="tx-input" placeholder="שם מלא" value={regForm.name} onChange={(e) => setRegForm((p) => ({ ...p, name: e.target.value }))} />
                  <input className="tx-input" placeholder="טלפון" value={regForm.phone} onChange={(e) => setRegForm((p) => ({ ...p, phone: e.target.value }))} />
                  <input className="tx-input" inputMode="numeric" placeholder="כמות נוסעים" value={regForm.passengerCount} onChange={(e) => setRegForm((p) => ({ ...p, passengerCount: e.target.value }))} />
                  <label className="flex items-center gap-2 rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] px-3 py-2 text-sm font-black text-[#1c2430]">
                    <input type="checkbox" checked={regForm.needsOutbound} onChange={(e) => setRegForm((p) => ({ ...p, needsOutbound: e.target.checked }))} />
                    צריך הלוך
                  </label>
                  <select className="tx-select" value={regForm.outboundRouteId} onChange={(e) => setRegForm((p) => ({ ...p, outboundRouteId: e.target.value, outboundStopId: "" }))}>
                    <option value="">קו הלוך</option>
                    {outboundRoutes.map((route) => {
                      const s = summaryRouteMap.get(id(route._id));
                      return (
                        <option key={route._id} value={route._id}>
                          {route.name} {routeClock(route) ? `· ${routeClock(route)}` : ""} {s ? `· ${s.remaining} פנויים` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <select className="tx-select" value={regForm.outboundStopId} onChange={(e) => setRegForm((p) => ({ ...p, outboundStopId: e.target.value }))}>
                    <option value="">תחנת איסוף</option>
                    {routeStops(regForm.outboundRouteId).map((stop) => (
                      <option key={stop._id} value={stop._id}>
                        {stop.name}
                        {stop.time ? ` · ${stop.time}` : ""}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] px-3 py-2 text-sm font-black text-[#1c2430]">
                    <input type="checkbox" checked={regForm.needsReturn} onChange={(e) => setRegForm((p) => ({ ...p, needsReturn: e.target.checked }))} />
                    צריך חזור
                  </label>
                  <select className="tx-select" value={regForm.returnRouteId} onChange={(e) => setRegForm((p) => ({ ...p, returnRouteId: e.target.value, returnStopId: "" }))}>
                    <option value="">קו / שעת חזור</option>
                    {returnRoutes.map((route) => {
                      const s = summaryRouteMap.get(id(route._id));
                      const remaining =
                        route.direction === "round_trip"
                          ? s?.returnRemaining ?? s?.remaining
                          : s?.remaining;
                      const clock = route.returnTime || route.departureTime || "";
                      return (
                        <option key={route._id} value={route._id}>
                          {route.name} {clock ? `· ${clock}` : ""}{" "}
                          {remaining !== undefined ? `· ${remaining} פנויים` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <select className="tx-select" value={regForm.returnStopId} onChange={(e) => setRegForm((p) => ({ ...p, returnStopId: e.target.value }))}>
                    <option value="">נקודת הורדה</option>
                    {routeStops(regForm.returnRouteId).map((stop) => (
                      <option key={stop._id} value={stop._id}>
                        {stop.name}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea className="tx-textarea mt-3 min-h-[80px]" placeholder="הערות" value={regForm.notes} onChange={(e) => setRegForm((p) => ({ ...p, notes: e.target.value }))} />
                <button type="button" disabled={busy} onClick={createRegistration} className="tx-btn primary mt-3">
                  {regForm.waitlist ? "הוספה להמתנה" : "שיבוץ נוסע"}
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <input className="tx-input min-w-[220px] flex-1" placeholder="חיפוש לפי שם / טלפון" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="tx-select max-w-[180px]" value={filterDirection} onChange={(e) => setFilterDirection(e.target.value)}>
                  <option value="all">כל הנוסעים</option>
                  <option value="outbound">הלוך</option>
                  <option value="return">חזור</option>
                  <option value="active">רשומים</option>
                  <option value="waitlisted">בהמתנה</option>
                  <option value="cancelled">מבוטלים</option>
                </select>
                <select className="tx-select max-w-[220px]" value={filterRouteId} onChange={(e) => setFilterRouteId(e.target.value)}>
                  <option value="all">כל הקווים</option>
                  {routes.map((route) => (
                    <option key={route._id} value={route._id}>
                      {route.name}
                    </option>
                  ))}
                </select>
                <select className="tx-select max-w-[220px]" value={filterStopId} onChange={(e) => setFilterStopId(e.target.value)}>
                  <option value="all">כל התחנות</option>
                  {stops.map((stop) => (
                    <option key={stop._id} value={stop._id}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tx-board overflow-x-auto">
                <table className="tx-table min-w-[1180px]">
                  <thead>
                    <tr>
                      {["נוסע", "טלפון", "כמות", "הלוך", "תחנת איסוף", "חזור", "הורדה", "סטטוס", "פעולות"].map((head) => (
                        <th key={head}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => {
                      const outRoute = routeMap.get(id(reg.outboundRouteId));
                      const retRoute = routeMap.get(id(reg.returnRouteId));
                      const outStop = stopMap.get(id(reg.outboundStopId));
                      const retStop = stopMap.get(id(reg.returnStopId));
                      return (
                        <tr key={reg._id}>
                          <td>
                            <div className="font-black text-[#1c2430]">{reg.name}</div>
                            {reg.notes ? <div className="text-xs text-[#66768a]">{reg.notes}</div> : null}
                          </td>
                          <td>{reg.phone || "—"}</td>
                          <td>{reg.passengerCount}</td>
                          <td>{reg.needsOutbound ? outRoute?.name || "לא שובץ" : "לא"}</td>
                          <td>{outStop?.name || "—"}</td>
                          <td>{reg.needsReturn ? retRoute?.name || "לא שובץ" : "לא"}</td>
                          <td>{retStop?.name || "—"}</td>
                          <td>
                            <span className={`tx-chip ${reg.status === "registered" ? "available" : reg.status === "waitlisted" ? "filling" : "full"}`}>
                              {REG_STATUS_LABEL[reg.status] || reg.status}
                            </span>
                          </td>
                          <td>
                            <div className="flex min-w-[320px] flex-wrap gap-2">
                              <select className="tx-select max-w-[150px]" value={id(reg.outboundRouteId)} onChange={(e) => patchRegistration(reg._id, { needsOutbound: Boolean(e.target.value), outboundRouteId: e.target.value || null, outboundStopId: null })}>
                                <option value="">ללא הלוך</option>
                                {outboundRoutes.map((route) => (
                                  <option key={route._id} value={route._id}>
                                    {route.name}
                                  </option>
                                ))}
                              </select>
                              <select className="tx-select max-w-[150px]" value={id(reg.returnRouteId)} onChange={(e) => patchRegistration(reg._id, { needsReturn: Boolean(e.target.value), returnRouteId: e.target.value || null, returnStopId: null })}>
                                <option value="">ללא חזור</option>
                                {returnRoutes.map((route) => (
                                  <option key={route._id} value={route._id}>
                                    {route.name}
                                  </option>
                                ))}
                              </select>
                              {reg.status !== "cancelled" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm("לבטל הרשמה להסעה?")) patchRegistration(reg._id, { action: "cancel" });
                                  }}
                                  className="tx-btn danger"
                                >
                                  ביטול
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredRegistrations.length === 0 ? <EmptyState text="אין נוסעים תואמים לסינון הנוכחי." /> : null}
              </div>

              {guestsWithoutTransport.length > 0 ? (
                <div className="tx-route-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-black text-[#1c2430]">
                      אורחים ללא בחירת הסעה ({guestsWithoutTransport.length})
                    </h3>
                    <span className="text-sm text-[#66768a]">מוצגים עד 24 אורחים</span>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {guestsWithoutTransport.slice(0, 24).map((guest) => (
                      <div key={guest._id} className="rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] px-3 py-2 text-sm">
                        <span className="font-black text-[#1c2430]">{guest.name}</span>
                        {guest.phone ? <span className="text-[#66768a]"> · {guest.phone}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {tab === "waitlist" && (
            <section className="space-y-5">
              {(summary?.waitlistOpportunities || []).length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {(summary?.waitlistOpportunities || []).map((item) => (
                    <div key={item.routeId} className="rounded-[22px] border border-[#5ec4a8]/30 bg-[#5ec4a8]/10 p-4">
                      <div className="font-black text-[#2f9d78]">{item.name}</div>
                      <div className="mt-1 text-sm text-[#1c2430]">{item.message}</div>
                      <div className="mt-1 text-xs text-[#66768a]">
                        {item.remaining} מקומות פנויים מול {item.waitlistedPassengers} נוסעים בהמתנה
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                {waitlistRows.map((reg) => {
                  const outRoute = routeMap.get(id(reg.outboundRouteId));
                  const retRoute = routeMap.get(id(reg.returnRouteId));
                  const outRemaining = reg.needsOutbound ? summaryRouteMap.get(id(reg.outboundRouteId))?.remaining ?? 0 : null;
                  const retRemaining = reg.needsReturn ? summaryRouteMap.get(id(reg.returnRouteId))?.remaining ?? 0 : null;
                  const availableToCompare = remainingForRegistration(reg);
                  const canFit = availableToCompare >= Number(reg.passengerCount || 0);
                  return (
                    <article key={reg._id} className="tx-route-card">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <span className={`tx-chip ${canFit ? "available" : "full"}`}>
                            {canFit ? "ניתן לשקול קידום" : "אין מספיק מקומות"}
                          </span>
                          <h2 className="mt-3 text-2xl font-black text-[#1c2430]">{reg.name}</h2>
                          <p className="mt-1 text-sm text-[#66768a]">
                            {reg.phone || "ללא טלפון"} · {reg.passengerCount} נוסעים
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] px-4 py-3 text-sm">
                          <div className="font-black text-[#1c2430]">בקשה מול קיבולת</div>
                          <div className="mt-1 text-[#66768a]">
                            מבקש {reg.passengerCount}; מינימום פנוי {availableToCompare}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {reg.needsOutbound ? (
                          <div className="rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] p-3">
                            <div className="text-xs font-black text-[#d4a35c]">הלוך</div>
                            <div className="mt-1 font-black text-[#1c2430]">{outRoute?.name || "קו לא נמצא"}</div>
                            <div className="text-sm text-[#66768a]">{outRemaining} מקומות פנויים</div>
                          </div>
                        ) : null}
                        {reg.needsReturn ? (
                          <div className="rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] p-3">
                            <div className="text-xs font-black text-[#d4a35c]">חזור</div>
                            <div className="mt-1 font-black text-[#1c2430]">{retRoute?.name || "קו לא נמצא"}</div>
                            <div className="text-sm text-[#66768a]">{retRemaining} מקומות פנויים</div>
                          </div>
                        ) : null}
                      </div>
                      {reg.notes ? <div className="mt-3 rounded-2xl bg-[#f7f9fc] px-3 py-2 text-sm text-[#66768a]">{reg.notes}</div> : null}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => patchRegistration(reg._id, { action: "promote" })} className="tx-btn primary">
                          אשר ושבץ
                        </button>
                        <button type="button" disabled={busy} onClick={() => patchRegistration(reg._id, { action: "reject" })} className="tx-btn danger">
                          דחה בקשה
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {waitlistRows.length === 0 ? <EmptyState text="רשימת ההמתנה ריקה כרגע." /> : null}
            </section>
          )}

          {tab === "dayof" && (
            <section className="grid gap-4 xl:grid-cols-2">
              {activeRoutes.map((route) => {
                const regs = routeRegistrations(id(route._id));
                const expected = regs.reduce((sum, reg) => sum + Number(reg.passengerCount || 0), 0);
                const boarded = regs
                  .filter((reg) => reg[routeBoardField(route, reg) as "outboundBoardStatus" | "returnBoardStatus"] === "boarded")
                  .reduce((sum, reg) => sum + Number(reg.passengerCount || 0), 0);
                const missing = Math.max(0, expected - boarded);
                const currentStops = routeStops(id(route._id));
                return (
                  <article key={route._id} className="tx-route-card">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="tx-live" />
                          <span className="tx-chip available">{STATUS_LABEL[route.status] || route.status}</span>
                        </div>
                        <h2 className="mt-3 text-2xl font-black text-[#1c2430]">{route.name}</h2>
                        <p className="mt-1 text-sm text-[#66768a]">
                          {DIRECTION_LABEL[route.direction]} {routeClock(route) ? `· ${routeClock(route)}` : ""}
                        </p>
                      </div>
                      <select className="tx-select max-w-[170px]" value={route.status} onChange={(e) => updateRouteStatus(route._id, e.target.value)}>
                        <option value="scheduled">מתוכנן</option>
                        <option value="boarding">בעלייה</option>
                        <option value="departed">יצא</option>
                        <option value="completed">הושלם</option>
                        <option value="cancelled">בוטל</option>
                      </select>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <Metric label="צפויים" value={expected} />
                      <Metric label="עלו" value={boarded} />
                      <Metric label="חסרים" value={missing} />
                    </div>
                    <div className="mt-5 tx-timeline">
                      {currentStops.map((stop) => {
                        const stopRegs = regs.filter(
                          (reg) => id(reg.outboundStopId) === id(stop._id) || id(reg.returnStopId) === id(stop._id)
                        );
                        const stopExpected = stopRegs.reduce((sum, reg) => sum + Number(reg.passengerCount || 0), 0);
                        const stopBoarded = stopRegs
                          .filter((reg) => reg[routeBoardField(route, reg) as "outboundBoardStatus" | "returnBoardStatus"] === "boarded")
                          .reduce((sum, reg) => sum + Number(reg.passengerCount || 0), 0);
                        const stopMissing = Math.max(0, stopExpected - stopBoarded);
                        return (
                          <div key={stop._id} className="tx-stop">
                            {stopExpected > 0 && stopMissing > 0 ? <span className="tx-bus" aria-hidden="true" /> : null}
                            <div className="rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-black text-[#1c2430]">
                                    {stop.name}
                                    {stop.time ? ` · ${stop.time}` : ""}
                                  </div>
                                  <div className="text-xs text-[#66768a]">
                                    {stopExpected} צפויים · {stopBoarded} עלו · {stopMissing} חסרים
                                  </div>
                                </div>
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-[#d4a35c]"
                                    style={{ width: `${stopExpected ? Math.round((stopBoarded / stopExpected) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-5 space-y-2">
                      {regs.map((reg) => {
                        const field = routeBoardField(route, reg) as "outboundBoardStatus" | "returnBoardStatus";
                        const boardStatus = reg[field];
                        return (
                          <div key={reg._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] px-3 py-2">
                            <div>
                              <div className="font-black text-[#1c2430]">{reg.name}</div>
                              <div className="text-xs text-[#66768a]">
                                {reg.passengerCount} נוסעים · {reg.phone || "ללא טלפון"} · {BOARD_LABEL[boardStatus] || boardStatus}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" disabled={busy} onClick={() => patchRegistration(reg._id, { [field]: "boarded" })} className={`tx-btn ${boardStatus === "boarded" ? "primary" : ""}`}>
                                עלה
                              </button>
                              <button type="button" disabled={busy} onClick={() => patchRegistration(reg._id, { [field]: "no_show" })} className={`tx-btn ${boardStatus === "no_show" ? "danger" : ""}`}>
                                חסר
                              </button>
                              <button type="button" disabled={busy} onClick={() => patchRegistration(reg._id, { [field]: "checked_in" })} className="tx-btn">
                                צ׳ק־אין
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {regs.length === 0 ? <div className="text-sm text-[#66768a]">אין נוסעים רשומים לקו זה.</div> : null}
                    </div>
                  </article>
                );
              })}
              {activeRoutes.length === 0 ? <EmptyState text="אין קווים פעילים לניהול ביום האירוע." /> : null}
            </section>
          )}

          {tab === "returns" && (
            <section className="space-y-5">
              <div className="tx-board">
                <div className="tx-board-row bg-[#f8fafc] text-xs font-black uppercase tracking-[0.25em] text-[#66768a]">
                  <div>שעה</div>
                  <div>קו חזור</div>
                  <div>סטטוס</div>
                </div>
                {returnRoutes.map((route) => {
                  const s = summaryRouteMap.get(id(route._id));
                  return (
                    <div key={route._id} className="tx-board-row">
                      <div className="text-2xl font-black text-[#d4a35c]">{routeClock(route) || "TBD"}</div>
                      <div>
                        <div className="text-lg font-black text-[#1c2430]">{route.name}</div>
                        <div className="text-sm text-[#66768a]">
                          {s?.registered ?? 0}/{s?.capacity ?? route.capacity} נוסעים · {s?.remaining ?? 0} פנויים
                          {route.driverName ? ` · ${route.driverName}` : ""}
                          {route.vehicleNumber ? ` · ${route.vehicleNumber}` : ""}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {routeStops(id(route._id)).slice(0, 4).map((stop) => (
                            <span key={stop._id} className="tx-chip">
                              {stop.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className={`tx-chip ${route.status === "departed" || route.status === "completed" ? "available" : "filling"}`}>
                          {STATUS_LABEL[route.status] || route.status}
                        </span>
                        <button type="button" onClick={() => updateRouteStatus(route._id, "boarding")} className="tx-btn">
                          פתח עלייה
                        </button>
                        <button type="button" onClick={() => updateRouteStatus(route._id, "departed")} className="tx-btn primary">
                          יצא
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {returnRoutes.length === 0 ? <EmptyState text="אין קווי חזור פעילים." /> : null}
            </section>
          )}

          {tab === "manifest" && (
            <section className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {routes.map((route) => (
                  <button
                    key={route._id}
                    type="button"
                    onClick={() => setSelectedRouteId(id(route._id))}
                    className={`tx-tab ${selectedRouteId === id(route._id) ? "active" : ""}`}
                  >
                    {route.name}
                  </button>
                ))}
                {selectedRouteId ? (
                  <button type="button" onClick={() => exportExcel("manifest", selectedRouteId)} className="tx-btn primary">
                    ייצוא מניפסט נהג
                  </button>
                ) : null}
              </div>

              {selectedRouteId ? (
                <article className="tx-route-card">
                  {(() => {
                    const route = routeMap.get(selectedRouteId);
                    if (!route) return <EmptyState text="בחרו קו להצגת מניפסט." />;
                    const regs = routeRegistrations(selectedRouteId);
                    const stopsForManifest = routeStops(selectedRouteId);
                    const unassigned = regs.filter(
                      (reg) =>
                        id(reg.outboundRouteId) === selectedRouteId
                          ? !reg.outboundStopId
                          : !reg.returnStopId
                    );
                    return (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.25em] text-[#d4a35c]">
                              Driver Manifest
                            </div>
                            <h2 className="mt-2 text-3xl font-black text-[#1c2430]">{route.name}</h2>
                            <p className="mt-1 text-sm text-[#66768a]">
                              {DIRECTION_LABEL[route.direction]} {routeClock(route) ? `· ${routeClock(route)}` : ""}
                              {route.driverName ? ` · נהג ${route.driverName}` : ""}
                              {route.driverPhone ? ` · ${route.driverPhone}` : ""}
                              {route.vehicleNumber ? ` · רכב ${route.vehicleNumber}` : ""}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#d7e0ec] bg-[#f7f9fc] px-4 py-3 text-center">
                            <div className="text-xs text-[#66768a]">נוסעים במניפסט</div>
                            <div className="text-3xl font-black text-[#1c2430]">
                              {regs.reduce((sum, reg) => sum + Number(reg.passengerCount || 0), 0)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 space-y-5">
                          {stopsForManifest.map((stop) => {
                            const stopRegs = regs.filter(
                              (reg) => id(reg.outboundStopId) === id(stop._id) || id(reg.returnStopId) === id(stop._id)
                            );
                            return (
                              <div key={stop._id} className="rounded-[22px] border border-[#d7e0ec] bg-[#f7f9fc] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <h3 className="text-xl font-black text-[#1c2430]">
                                    {stop.name}
                                    {stop.time ? ` · ${stop.time}` : ""}
                                  </h3>
                                  <span className="tx-chip">{stopRegs.length} רשומות</span>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {stopRegs.map((reg) => {
                                    const field = routeBoardField(route, reg) as "outboundBoardStatus" | "returnBoardStatus";
                                    const boarded = reg[field] === "boarded";
                                    return (
                                      <div key={reg._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f8fafc] px-3 py-2">
                                        <div>
                                          <span className="font-black text-[#1c2430]">{reg.name}</span>
                                          <span className="text-sm text-[#66768a]">
                                            {" "}
                                            · {reg.phone || "ללא טלפון"} · {reg.passengerCount} נוסעים
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => patchRegistration(reg._id, { [field]: boarded ? "registered" : "boarded" })}
                                          className={`tx-btn ${boarded ? "primary" : ""}`}
                                        >
                                          {boarded ? "עלה" : "סמן עלה"}
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {stopRegs.length === 0 ? <div className="text-sm text-[#66768a]">אין נוסעים בתחנה זו.</div> : null}
                                </div>
                              </div>
                            );
                          })}

                          {unassigned.length > 0 ? (
                            <div className="rounded-[22px] border border-[#e0b35a]/35 bg-[#e0b35a]/10 p-4">
                              <h3 className="text-xl font-black text-[#8a6a16]">ללא תחנה משויכת</h3>
                              <div className="mt-3 grid gap-2 md:grid-cols-2">
                                {unassigned.map((reg) => (
                                  <div key={reg._id} className="rounded-2xl bg-[#f7f9fc] px-3 py-2 text-sm">
                                    <span className="font-black text-[#1c2430]">{reg.name}</span>
                                    <span className="text-[#66768a]"> · {reg.passengerCount} נוסעים</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </>
                    );
                  })()}
                </article>
              ) : (
                <EmptyState text="בחרו קו להצגת מניפסט נהג." />
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

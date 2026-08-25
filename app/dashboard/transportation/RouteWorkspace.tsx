"use client";

import { useEffect, useMemo, useState } from "react";
import TimeField from "./TimeField";

type CapacityLevel = "available" | "filling" | "almost_full" | "full";

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
};

type RouteSummary = {
  routeId: string;
  capacity: number;
  registered: number;
  remaining: number;
  returnCapacity?: number;
  returnRegistered?: number;
  returnRemaining?: number;
  level?: CapacityLevel;
  returnLevel?: CapacityLevel;
  waitlistedPassengers?: number;
  stopCount?: number;
  status?: string;
};

type StopSummary = {
  stopId: string;
  expected: number;
  boarded: number;
  missing: number;
};

const DIRECTION_LABEL: Record<string, string> = {
  outbound: "הלוך",
  return: "חזור",
  round_trip: "הלוך וחזור",
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

type SubTab = "route" | "passengers" | "dayof" | "settings";

type Props = {
  eventId: string;
  route: RouteRow;
  summary?: RouteSummary | null;
  stops: StopRow[];
  stopSummaries: StopSummary[];
  registrations: RegistrationRow[];
  busy: boolean;
  onReload: () => Promise<void>;
  onToast: (message: string) => void;
  onPatchRegistration: (id: string, body: Record<string, unknown>) => Promise<void>;
  onUpdateStatus: (routeId: string, status: string) => Promise<void>;
};

function id(value: unknown) {
  return value ? String(value) : "";
}

export default function RouteWorkspace({
  eventId,
  route,
  summary,
  stops,
  stopSummaries,
  registrations,
  busy,
  onReload,
  onToast,
  onPatchRegistration,
  onUpdateStatus,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("route");
  const [expandedStopId, setExpandedStopId] = useState("");
  const [editingStopId, setEditingStopId] = useState("");
  const [dragStopId, setDragStopId] = useState("");
  const [saving, setSaving] = useState(false);

  const [stopForm, setStopForm] = useState({
    name: "",
    address: "",
    time: "",
    landmark: "",
    mapLink: "",
    notes: "",
  });

  const [editStopForm, setEditStopForm] = useState({
    name: "",
    address: "",
    time: "",
    landmark: "",
    mapLink: "",
    notes: "",
  });

  const [settingsForm, setSettingsForm] = useState({
    name: route.name,
    direction: route.direction,
    departureTime: route.departureTime || "",
    returnTime: route.returnTime || "",
    capacity: String(route.capacity ?? 50),
    returnCapacity: String(route.returnCapacity ?? route.capacity ?? 50),
    companyName: route.companyName || "",
    driverName: route.driverName || "",
    driverPhone: route.driverPhone || "",
    vehicleNumber: route.vehicleNumber || "",
    notes: route.notes || "",
  });

  useEffect(() => {
    setSettingsForm({
      name: route.name,
      direction: route.direction,
      departureTime: route.departureTime || "",
      returnTime: route.returnTime || "",
      capacity: String(route.capacity ?? 50),
      returnCapacity: String(route.returnCapacity ?? route.capacity ?? 50),
      companyName: route.companyName || "",
      driverName: route.driverName || "",
      driverPhone: route.driverPhone || "",
      vehicleNumber: route.vehicleNumber || "",
      notes: route.notes || "",
    });
    setSubTab("route");
    setExpandedStopId("");
    setEditingStopId("");
  }, [route._id]);

  const orderedStops = useMemo(
    () =>
      [...stops].sort(
        (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      ),
    [stops]
  );

  const stopMap = useMemo(
    () => new Map(orderedStops.map((s) => [id(s._id), s])),
    [orderedStops]
  );

  const stopSummaryMap = useMemo(
    () => new Map(stopSummaries.map((s) => [id(s.stopId), s])),
    [stopSummaries]
  );

  const routeRegs = useMemo(
    () =>
      registrations.filter(
        (reg) =>
          id(reg.outboundRouteId) === id(route._id) ||
          id(reg.returnRouteId) === id(route._id)
      ),
    [registrations, route._id]
  );

  const activeRegs = routeRegs.filter((r) => r.status === "registered");
  const waitlistedRegs = routeRegs.filter((r) => r.status === "waitlisted");

  function boardField(reg: RegistrationRow) {
    if (route.direction === "return") return "returnBoardStatus" as const;
    if (id(reg.outboundRouteId) === id(route._id)) {
      return "outboundBoardStatus" as const;
    }
    return "returnBoardStatus" as const;
  }

  function passengerLegs(reg: RegistrationRow) {
    const legs: string[] = [];
    if (reg.needsOutbound && id(reg.outboundRouteId) === id(route._id)) {
      legs.push("הלוך");
    }
    if (reg.needsReturn && id(reg.returnRouteId) === id(route._id)) {
      legs.push("חזור");
    }
    return legs.join(" + ") || "—";
  }

  function pickupStop(reg: RegistrationRow) {
    if (id(reg.outboundRouteId) === id(route._id) && reg.outboundStopId) {
      return stopMap.get(id(reg.outboundStopId));
    }
    if (id(reg.returnRouteId) === id(route._id) && reg.returnStopId) {
      return stopMap.get(id(reg.returnStopId));
    }
    return null;
  }

  function regsForStop(stopId: string) {
    return activeRegs.filter(
      (reg) =>
        id(reg.outboundStopId) === stopId || id(reg.returnStopId) === stopId
    );
  }

  async function createStop() {
    if (!stopForm.name.trim()) {
      onToast("שם תחנה נדרש");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/transportation/routes/${route._id}/stops`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stopForm),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        onToast(data?.error || "שגיאה בהוספת תחנה");
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
      onToast("תחנה נוספה למסלול");
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  async function saveStopEdit(stopId: string) {
    if (!editStopForm.name.trim()) {
      onToast("שם תחנה נדרש");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/transportation/stops/${stopId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editStopForm),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        onToast(data?.error || "שגיאה בעדכון תחנה");
        return;
      }
      setEditingStopId("");
      onToast("תחנה עודכנה");
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  async function deleteStop(stopId: string) {
    if (!window.confirm("למחוק את התחנה מהמסלול?")) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/transportation/stops/${stopId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        onToast("שגיאה במחיקת תחנה");
        return;
      }
      onToast("תחנה נמחקה");
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  async function reorderStops(orderedIds: string[]) {
    setSaving(true);
    try {
      await fetch(
        `/api/events/${eventId}/transportation/routes/${route._id}/stops`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedStopIds: orderedIds }),
        }
      );
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  async function moveStop(stopId: string, direction: -1 | 1) {
    const ordered = orderedStops.map((s) => id(s._id));
    const index = ordered.indexOf(stopId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    await reorderStops(ordered);
  }

  function onDropStop(targetStopId: string) {
    if (!dragStopId || dragStopId === targetStopId) {
      setDragStopId("");
      return;
    }
    const ordered = orderedStops.map((s) => id(s._id));
    const from = ordered.indexOf(dragStopId);
    const to = ordered.indexOf(targetStopId);
    if (from < 0 || to < 0) {
      setDragStopId("");
      return;
    }
    ordered.splice(from, 1);
    ordered.splice(to, 0, dragStopId);
    setDragStopId("");
    void reorderStops(ordered);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/transportation/routes/${route._id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...settingsForm,
            capacity: Number(settingsForm.capacity || 0),
            returnCapacity: Number(settingsForm.returnCapacity || 0),
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        onToast(data?.error || "שגיאה בשמירת הקו");
        return;
      }
      onToast("הגדרות הקו נשמרו");
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  const outboundRegistered = summary?.registered ?? Number(route.reservedSeats || 0);
  const outboundCapacity = summary?.capacity ?? route.capacity;
  const outboundRemaining =
    summary?.remaining ?? Math.max(0, outboundCapacity - outboundRegistered);
  const returnRegistered =
    summary?.returnRegistered ?? Number(route.returnReservedSeats || 0);
  const returnCapacity =
    summary?.returnCapacity ??
    Number(route.returnCapacity ?? route.capacity ?? 0);
  const returnRemaining =
    summary?.returnRemaining ?? Math.max(0, returnCapacity - returnRegistered);

  const boardedCount = activeRegs.reduce((sum, reg) => {
    const field = boardField(reg);
    return sum + (reg[field] === "boarded" ? Number(reg.passengerCount || 0) : 0);
  }, 0);
  const expectedCount = activeRegs.reduce(
    (sum, reg) => sum + Number(reg.passengerCount || 0),
    0
  );
  const missingCount = Math.max(0, expectedCount - boardedCount);

  return (
    <div className="tx-workspace">
      <header className="tx-workspace-head">
        <div>
          <div className="tx-workspace-badges">
            <span className={`tx-dir-badge ${route.direction}`}>
              {DIRECTION_LABEL[route.direction]}
            </span>
            {!route.active ? <span className="tx-chip full">כבוי</span> : null}
            <span className="tx-chip">{route.status}</span>
          </div>
          <h2 className="tx-workspace-title">{route.name}</h2>
          <p className="tx-workspace-sub">
            {route.direction === "round_trip" ? (
              <>
                יציאה {route.departureTime || "—"} · חזרה {route.returnTime || "—"}
              </>
            ) : route.direction === "return" ? (
              <>שעת חזרה {route.returnTime || route.departureTime || "—"}</>
            ) : (
              <>שעת יציאה {route.departureTime || "—"}</>
            )}
            {route.companyName ? ` · ${route.companyName}` : ""}
            {route.driverName ? ` · נהג ${route.driverName}` : ""}
          </p>
        </div>

        <div className="tx-workspace-metrics">
          {route.direction === "round_trip" ? (
            <>
              <div className="tx-mini-stat">
                <span>הלוך</span>
                <strong>
                  {outboundRegistered}/{outboundCapacity}
                </strong>
                <em>{outboundRemaining} פנויים</em>
              </div>
              <div className="tx-mini-stat">
                <span>חזור</span>
                <strong>
                  {returnRegistered}/{returnCapacity}
                </strong>
                <em>{returnRemaining} פנויים</em>
              </div>
            </>
          ) : (
            <div className="tx-mini-stat">
              <span>קיבולת</span>
              <strong>
                {outboundRegistered}/{outboundCapacity}
              </strong>
              <em>{outboundRemaining} פנויים</em>
            </div>
          )}
          <div className="tx-mini-stat">
            <span>המתנה</span>
            <strong>{summary?.waitlistedPassengers || waitlistedRegs.length}</strong>
          </div>
          <div className="tx-mini-stat">
            <span>תחנות</span>
            <strong>{orderedStops.length}</strong>
          </div>
          <div className="tx-mini-stat">
            <span>יום האירוע</span>
            <strong>
              {boardedCount}/{expectedCount}
            </strong>
            <em>{missingCount} חסרים</em>
          </div>
        </div>
      </header>

      <div className="tx-workspace-tabs">
        {(
          [
            ["route", "מסלול ותחנות"],
            ["passengers", "הנרשמים לקו"],
            ["dayof", "יום האירוע"],
            ["settings", "הגדרות קו"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`tx-tab ${subTab === key ? "active" : ""}`}
            onClick={() => setSubTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "route" && (
        <section className="tx-workspace-body">
          <div className="tx-builder-head">
            <div>
              <h3>מסלול הקו</h3>
              <p>התחנות הן המשך ישיר של הקו — לפי סדר העלייה.</p>
            </div>
            <span className="tx-chip filling">{orderedStops.length} תחנות</span>
          </div>

          <div className="tx-route-builder">
            {orderedStops.map((stop, index) => {
              const stats = stopSummaryMap.get(id(stop._id));
              const stopRegs = regsForStop(id(stop._id));
              const expanded = expandedStopId === id(stop._id);
              const editing = editingStopId === id(stop._id);
              return (
                <div key={stop._id} className="tx-builder-node">
                  <div
                    className={`tx-builder-card ${dragStopId === id(stop._id) ? "dragging" : ""}`}
                    draggable
                    onDragStart={() => setDragStopId(id(stop._id))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropStop(id(stop._id))}
                  >
                    <div className="tx-builder-card-top">
                      <div>
                        <div className="tx-builder-index">תחנה {index + 1}</div>
                        <h4>
                          {stop.name}
                          {stop.time ? ` · ${stop.time}` : ""}
                        </h4>
                        <p>
                          {stop.address || "ללא כתובת"}
                          {stop.landmark ? ` · ${stop.landmark}` : ""}
                        </p>
                        {stop.notes ? (
                          <p className="tx-builder-notes">{stop.notes}</p>
                        ) : null}
                      </div>
                      <div className="tx-builder-side">
                        <div className="tx-mini-stat compact">
                          <span>נוסעים</span>
                          <strong>{stats?.expected ?? stopRegs.reduce((s, r) => s + r.passengerCount, 0)}</strong>
                        </div>
                        <div className="tx-mini-stat compact">
                          <span>עלו</span>
                          <strong>{stats?.boarded ?? 0}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="tx-builder-actions">
                      {stop.mapLink ? (
                        <a
                          href={stop.mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="tx-btn"
                        >
                          Waze / מפה
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="tx-btn"
                        onClick={() =>
                          setExpandedStopId(expanded ? "" : id(stop._id))
                        }
                      >
                        {expanded ? "הסתר נוסעים" : "נוסעי התחנה"}
                      </button>
                      <button
                        type="button"
                        className="tx-btn"
                        disabled={busy || saving || index === 0}
                        onClick={() => moveStop(id(stop._id), -1)}
                      >
                        למעלה
                      </button>
                      <button
                        type="button"
                        className="tx-btn"
                        disabled={
                          busy || saving || index === orderedStops.length - 1
                        }
                        onClick={() => moveStop(id(stop._id), 1)}
                      >
                        למטה
                      </button>
                      <button
                        type="button"
                        className="tx-btn"
                        onClick={() => {
                          setEditingStopId(id(stop._id));
                          setEditStopForm({
                            name: stop.name || "",
                            address: stop.address || "",
                            time: stop.time || "",
                            landmark: stop.landmark || "",
                            mapLink: stop.mapLink || "",
                            notes: stop.notes || "",
                          });
                        }}
                      >
                        עריכה
                      </button>
                      <button
                        type="button"
                        className="tx-btn danger"
                        disabled={busy || saving}
                        onClick={() => deleteStop(id(stop._id))}
                      >
                        מחיקה
                      </button>
                    </div>

                    {editing ? (
                      <div className="tx-inline-form">
                        <input
                          className="tx-input"
                          placeholder="שם תחנה"
                          value={editStopForm.name}
                          onChange={(e) =>
                            setEditStopForm((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                        />
                        <TimeField
                          label="שעת תחנה"
                          value={editStopForm.time}
                          onChange={(time) =>
                            setEditStopForm((p) => ({ ...p, time }))
                          }
                          placeholder="07:45"
                        />
                        <input
                          className="tx-input"
                          placeholder="כתובת"
                          value={editStopForm.address}
                          onChange={(e) =>
                            setEditStopForm((p) => ({
                              ...p,
                              address: e.target.value,
                            }))
                          }
                        />
                        <input
                          className="tx-input"
                          placeholder="הערות / נקודת ציון"
                          value={editStopForm.landmark}
                          onChange={(e) =>
                            setEditStopForm((p) => ({
                              ...p,
                              landmark: e.target.value,
                            }))
                          }
                        />
                        <input
                          className="tx-input"
                          placeholder="קישור Waze / מפה"
                          value={editStopForm.mapLink}
                          onChange={(e) =>
                            setEditStopForm((p) => ({
                              ...p,
                              mapLink: e.target.value,
                            }))
                          }
                        />
                        <textarea
                          className="tx-textarea"
                          placeholder="הערות לתחנה"
                          value={editStopForm.notes}
                          onChange={(e) =>
                            setEditStopForm((p) => ({
                              ...p,
                              notes: e.target.value,
                            }))
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="tx-btn primary"
                            disabled={saving}
                            onClick={() => saveStopEdit(id(stop._id))}
                          >
                            שמירת תחנה
                          </button>
                          <button
                            type="button"
                            className="tx-btn"
                            onClick={() => setEditingStopId("")}
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {expanded ? (
                      <div className="tx-stop-passengers">
                        {stopRegs.length === 0 ? (
                          <div className="text-sm font-bold text-[#66768a]">
                            אין נוסעים משויכים לתחנה הזו עדיין.
                          </div>
                        ) : (
                          <table className="tx-table">
                            <thead>
                              <tr>
                                <th>שם</th>
                                <th>טלפון</th>
                                <th>כמות</th>
                                <th>כיוון</th>
                                <th>סטטוס עלייה</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stopRegs.map((reg) => {
                                const field = boardField(reg);
                                return (
                                  <tr key={reg._id}>
                                    <td className="font-black">{reg.name}</td>
                                    <td>{reg.phone || "—"}</td>
                                    <td>{reg.passengerCount}</td>
                                    <td>{passengerLegs(reg)}</td>
                                    <td>{BOARD_LABEL[reg[field]] || reg[field]}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="tx-builder-arrow" aria-hidden="true">
                    ↓
                  </div>
                </div>
              );
            })}

            <div className="tx-builder-card venue">
              <div className="tx-builder-index">יעד</div>
              <h4>אולם / יעד האירוע</h4>
              <p>סיום המסלול — נקודת ההגעה של הקו.</p>
            </div>
          </div>

          <div className="tx-add-stop">
            <h3>הוספת תחנה</h3>
            <p>התחנה תתווסף מיד בסוף המסלול לפי הסדר.</p>
            <div className="tx-inline-form">
              <input
                className="tx-input"
                placeholder="שם תחנה"
                value={stopForm.name}
                onChange={(e) =>
                  setStopForm((p) => ({ ...p, name: e.target.value }))
                }
              />
              <TimeField
                label="שעת תחנה"
                value={stopForm.time}
                onChange={(time) => setStopForm((p) => ({ ...p, time }))}
                placeholder="07:45"
              />
              <input
                className="tx-input"
                placeholder="כתובת מלאה"
                value={stopForm.address}
                onChange={(e) =>
                  setStopForm((p) => ({ ...p, address: e.target.value }))
                }
              />
              <input
                className="tx-input"
                placeholder="הערות / נקודת ציון"
                value={stopForm.landmark}
                onChange={(e) =>
                  setStopForm((p) => ({ ...p, landmark: e.target.value }))
                }
              />
              <input
                className="tx-input"
                placeholder="קישור Waze / מפה"
                value={stopForm.mapLink}
                onChange={(e) =>
                  setStopForm((p) => ({ ...p, mapLink: e.target.value }))
                }
              />
              <textarea
                className="tx-textarea"
                placeholder="הערות לתחנה"
                value={stopForm.notes}
                onChange={(e) =>
                  setStopForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
              <button
                type="button"
                className="tx-btn primary"
                disabled={busy || saving}
                onClick={createStop}
              >
                הוספת תחנה
              </button>
            </div>
          </div>
        </section>
      )}

      {subTab === "passengers" && (
        <section className="tx-workspace-body">
          <div className="tx-builder-head">
            <div>
              <h3>הנרשמים לקו</h3>
              <p>כל הנוסעים ששייכים לקו הזה — בלי לחפש במסך כללי.</p>
            </div>
            <span className="tx-chip available">{routeRegs.length} רשומות</span>
          </div>
          {routeRegs.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[#d7e0ec] p-8 text-center text-sm font-bold text-[#66768a]">
              אין עדיין נרשמים לקו הזה.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[20px] border border-[#d7e0ec] bg-white">
              <table className="tx-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>טלפון</th>
                    <th>כמות</th>
                    <th>תחנת איסוף</th>
                    <th>הלוך / חזור</th>
                    <th>שעת חזור</th>
                    <th>סטטוס</th>
                    <th>עלה בפועל</th>
                    <th>הערות</th>
                  </tr>
                </thead>
                <tbody>
                  {routeRegs.map((reg) => {
                    const stop = pickupStop(reg);
                    const field = boardField(reg);
                    const boarded = reg[field] === "boarded";
                    return (
                      <tr key={reg._id}>
                        <td className="font-black">{reg.name}</td>
                        <td>{reg.phone || "—"}</td>
                        <td>{reg.passengerCount}</td>
                        <td>{stop?.name || "—"}</td>
                        <td>{passengerLegs(reg)}</td>
                        <td>
                          {reg.needsReturn
                            ? route.returnTime || route.departureTime || "—"
                            : "—"}
                        </td>
                        <td>{REG_STATUS_LABEL[reg.status] || reg.status}</td>
                        <td>
                          <span className={`tx-chip ${boarded ? "available" : "filling"}`}>
                            {boarded ? "עלה" : BOARD_LABEL[reg[field]] || "לא עלה"}
                          </span>
                        </td>
                        <td>{reg.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {subTab === "dayof" && (
        <section className="tx-workspace-body space-y-4">
          <div className="tx-builder-head">
            <div>
              <h3>יום האירוע — {route.name}</h3>
              <p>תחנות, נוסעים, מי עלה וכמה נשאר על הקו הזה.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="tx-select max-w-[180px]"
                value={route.status}
                onChange={(e) => onUpdateStatus(route._id, e.target.value)}
              >
                <option value="scheduled">מתוכנן</option>
                <option value="boarding">בעלייה</option>
                <option value="departed">יצא</option>
                <option value="completed">הושלם</option>
                <option value="cancelled">בוטל</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="tx-mini-stat">
              <span>צפויים</span>
              <strong>{expectedCount}</strong>
            </div>
            <div className="tx-mini-stat">
              <span>עלו</span>
              <strong>{boardedCount}</strong>
            </div>
            <div className="tx-mini-stat">
              <span>חסרים</span>
              <strong>{missingCount}</strong>
            </div>
            <div className="tx-mini-stat">
              <span>נותרו במקומות</span>
              <strong>
                {route.direction === "round_trip"
                  ? outboundRemaining + returnRemaining
                  : outboundRemaining}
              </strong>
            </div>
          </div>

          <div className="tx-route-builder">
            {orderedStops.map((stop, index) => {
              const stats = stopSummaryMap.get(id(stop._id));
              const stopRegs = regsForStop(id(stop._id));
              return (
                <div key={stop._id} className="tx-builder-node">
                  <div className="tx-builder-card">
                    <div className="tx-builder-card-top">
                      <div>
                        <div className="tx-builder-index">תחנה {index + 1}</div>
                        <h4>
                          {stop.name}
                          {stop.time ? ` · ${stop.time}` : ""}
                        </h4>
                        <p>
                          צפויים {stats?.expected ?? 0} · עלו {stats?.boarded ?? 0} ·
                          חסרים {stats?.missing ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 mt-3">
                      {stopRegs.map((reg) => {
                        const field = boardField(reg);
                        return (
                          <div
                            key={reg._id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#f7f9fc] px-3 py-2"
                          >
                            <div>
                              <div className="font-black text-[#1c2430]">
                                {reg.name} · {reg.passengerCount}
                              </div>
                              <div className="text-xs text-[#66768a]">
                                {BOARD_LABEL[reg[field]] || reg[field]}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="tx-btn primary"
                                disabled={busy}
                                onClick={() =>
                                  onPatchRegistration(reg._id, {
                                    [field]: "boarded",
                                  })
                                }
                              >
                                עלה
                              </button>
                              <button
                                type="button"
                                className="tx-btn danger"
                                disabled={busy}
                                onClick={() =>
                                  onPatchRegistration(reg._id, {
                                    [field]: "no_show",
                                  })
                                }
                              >
                                חסר
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {stopRegs.length === 0 ? (
                        <div className="text-sm font-bold text-[#66768a]">
                          אין נוסעים בתחנה הזו.
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="tx-builder-arrow" aria-hidden="true">
                    ↓
                  </div>
                </div>
              );
            })}
            <div className="tx-builder-card venue">
              <div className="tx-builder-index">יעד</div>
              <h4>אולם</h4>
              <p>
                עלו {boardedCount} מתוך {expectedCount} · נשארו {missingCount} חסרים
              </p>
            </div>
          </div>
        </section>
      )}

      {subTab === "settings" && (
        <section className="tx-workspace-body">
          <div className="tx-builder-head">
            <div>
              <h3>הגדרות הקו</h3>
              <p>סוג קו, שעות וקיבולת — כולל הלוך וחזור באותו קו.</p>
            </div>
          </div>
          <div className="tx-inline-form">
            <input
              className="tx-input"
              placeholder="שם הקו"
              value={settingsForm.name}
              onChange={(e) =>
                setSettingsForm((p) => ({ ...p, name: e.target.value }))
              }
            />
            <div className="tx-segment">
              {(
                [
                  ["outbound", "הלוך בלבד"],
                  ["return", "חזור בלבד"],
                  ["round_trip", "הלוך וחזור"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={settingsForm.direction === value ? "active" : ""}
                  onClick={() =>
                    setSettingsForm((p) => ({ ...p, direction: value }))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TimeField
                label="שעת יציאה (הלוך)"
                value={settingsForm.departureTime}
                onChange={(departureTime) =>
                  setSettingsForm((p) => ({ ...p, departureTime }))
                }
                placeholder="08:00"
                hint="ליציאה להלוך"
              />
              <TimeField
                label="שעת חזרה"
                value={settingsForm.returnTime}
                onChange={(returnTime) =>
                  setSettingsForm((p) => ({ ...p, returnTime }))
                }
                placeholder="00:30"
                hint="לקו חזור / הלוך וחזור"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="tx-time-field">
                <span className="tx-time-label">
                  {settingsForm.direction === "round_trip"
                    ? "קיבולת הלוך"
                    : "קיבולת"}
                </span>
                <input
                  className="tx-input"
                  inputMode="numeric"
                  value={settingsForm.capacity}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, capacity: e.target.value }))
                  }
                />
              </label>
              {settingsForm.direction === "round_trip" ? (
                <label className="tx-time-field">
                  <span className="tx-time-label">קיבולת חזור</span>
                  <input
                    className="tx-input"
                    inputMode="numeric"
                    value={settingsForm.returnCapacity}
                    onChange={(e) =>
                      setSettingsForm((p) => ({
                        ...p,
                        returnCapacity: e.target.value,
                      }))
                    }
                  />
                </label>
              ) : null}
            </div>
            <input
              className="tx-input"
              placeholder="חברת הסעות"
              value={settingsForm.companyName}
              onChange={(e) =>
                setSettingsForm((p) => ({ ...p, companyName: e.target.value }))
              }
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="tx-input"
                placeholder="שם נהג"
                value={settingsForm.driverName}
                onChange={(e) =>
                  setSettingsForm((p) => ({ ...p, driverName: e.target.value }))
                }
              />
              <input
                className="tx-input"
                placeholder="טלפון נהג"
                value={settingsForm.driverPhone}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    driverPhone: e.target.value,
                  }))
                }
              />
            </div>
            <input
              className="tx-input"
              placeholder="מספר אוטובוס / רכב"
              value={settingsForm.vehicleNumber}
              onChange={(e) =>
                setSettingsForm((p) => ({
                  ...p,
                  vehicleNumber: e.target.value,
                }))
              }
            />
            <textarea
              className="tx-textarea"
              placeholder="הערות תפעוליות"
              value={settingsForm.notes}
              onChange={(e) =>
                setSettingsForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
            <button
              type="button"
              className="tx-btn primary"
              disabled={busy || saving}
              onClick={saveSettings}
            >
              שמירת הגדרות הקו
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

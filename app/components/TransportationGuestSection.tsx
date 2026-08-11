"use client";

import { useEffect, useMemo, useState } from "react";

type CapacityLevel = "available" | "filling" | "almost_full" | "full";

type PublicRoute = {
  _id: string;
  name: string;
  direction: string;
  departureTime?: string;
  returnTime?: string;
  capacity: number;
  registered: number;
  remaining: number;
  level?: CapacityLevel;
  legacyLevel?: string;
  levelLabel?: string;
  full: boolean;
  returnCapacity?: number;
  returnRegistered?: number;
  returnRemaining?: number;
  returnLevel?: CapacityLevel;
  returnFull?: boolean;
};

function remainingForLeg(route: PublicRoute | null | undefined, leg: "outbound" | "return") {
  if (!route) return 0;
  if (leg === "return" && route.direction === "round_trip") {
    return Number(route.returnRemaining ?? route.remaining ?? 0);
  }
  return Number(route.remaining ?? 0);
}

type PublicStop = {
  _id: string;
  routeId: string;
  name: string;
  address?: string;
  time?: string;
  landmark?: string;
  mapLink?: string;
  stopType?: string;
  notes?: string;
};

type Props = {
  shareId: string;
  guestToken?: string;
};

const LEVEL_LABEL: Record<CapacityLevel, string> = {
  available: "זמין",
  filling: "מתמלא",
  almost_full: "כמעט מלא",
  full: "מלא",
};

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

function routeTime(route?: PublicRoute | null) {
  return route?.departureTime || route?.returnTime || "";
}

function capacityPct(route?: PublicRoute | null) {
  if (!route || route.capacity <= 0) return 100;
  return Math.min(100, Math.round((route.registered / route.capacity) * 100));
}

export default function TransportationGuestSection({ shareId, guestToken }: Props) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState("");
  const [routes, setRoutes] = useState<PublicRoute[]>([]);
  const [stops, setStops] = useState<PublicStop[]>([]);
  const [notes, setNotes] = useState("");
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [localNoTransport, setLocalNoTransport] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [needTransport, setNeedTransport] = useState<boolean | null>(null);
  const [canJoinWaitlist, setCanJoinWaitlist] = useState(false);
  const [lastRemaining, setLastRemaining] = useState<number | null>(null);

  const [form, setForm] = useState({
    invitationGuestId: "",
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
        const query = params.toString();
        const res = await fetch(
          `/api/invite/${shareId}/transportation${query ? `?${query}` : ""}`
        );
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.available) {
          setAvailable(false);
          return;
        }

        setAvailable(true);
        setEventTitle(data.eventTitle || "");
        setRoutes(data.routes || []);
        setStops(data.stops || []);
        setNotes(data.settings?.notes || "");
        setWaitlistEnabled(Boolean(data.settings?.waitlistEnabled));

        if (data.guestPrefill) {
          setForm((prev) => ({
            ...prev,
            invitationGuestId: data.guestPrefill.invitationGuestId || prev.invitationGuestId,
            name: data.guestPrefill.name || prev.name,
            phone: data.guestPrefill.phone || prev.phone,
          }));
        }

        if (data.existingRegistration) {
          setExisting(data.existingRegistration);
          setWaitlisted(data.existingRegistration.status === "waitlisted");
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
        (route) => route.direction === "outbound" || route.direction === "round_trip"
      ),
    [routes]
  );

  const returnRoutes = useMemo(
    () =>
      routes.filter(
        (route) => route.direction === "return" || route.direction === "round_trip"
      ),
    [routes]
  );

  const outboundRoute = useMemo(
    () => routes.find((route) => route._id === form.outboundRouteId) || null,
    [form.outboundRouteId, routes]
  );

  const returnRoute = useMemo(
    () => routes.find((route) => route._id === form.returnRouteId) || null,
    [form.returnRouteId, routes]
  );

  const outboundStops = useMemo(
    () => stops.filter((stop) => stop.routeId === form.outboundRouteId),
    [form.outboundRouteId, stops]
  );

  const returnStops = useMemo(
    () => stops.filter((stop) => stop.routeId === form.returnRouteId),
    [form.returnRouteId, stops]
  );

  const selectedRemaining = useMemo(() => {
    const values: number[] = [];
    if (form.needsOutbound && outboundRoute) {
      values.push(remainingForLeg(outboundRoute, "outbound"));
    }
    if (form.needsReturn && returnRoute) {
      values.push(remainingForLeg(returnRoute, "return"));
    }
    return values.length ? Math.min(...values) : null;
  }, [form.needsOutbound, form.needsReturn, outboundRoute, returnRoute]);

  const passengerCount = Math.max(1, Number(form.passengerCount || 1));
  const overCapacity =
    selectedRemaining !== null && passengerCount > selectedRemaining && selectedRemaining >= 0;

  function chooseRoute(route: PublicRoute, direction: "outbound" | "return") {
    setError("");
    setCanJoinWaitlist(false);
    if (direction === "outbound") {
      setForm((prev) => ({
        ...prev,
        needsOutbound: true,
        outboundRouteId: route._id,
        outboundStopId: "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        needsReturn: true,
        returnRouteId: route._id,
        returnStopId: "",
      }));
    }
  }

  function validateCurrentStep() {
    setError("");
    if (step === 0) {
      if (needTransport === null) {
        setError("בחרו האם תרצו הסעה לאירוע.");
        return false;
      }
      return true;
    }
    if (step === 1 && form.needsOutbound && !form.outboundRouteId) {
      setError("בחרו קו הלוך או סמנו שאין צורך בהלוך.");
      return false;
    }
    if (step === 2 && form.needsOutbound && outboundStops.length > 0 && !form.outboundStopId) {
      setError("בחרו נקודת איסוף.");
      return false;
    }
    if (step === 3 && passengerCount < 1) {
      setError("כמות נוסעים חייבת להיות לפחות 1.");
      return false;
    }
    if (step === 4) {
      if (form.needsReturn && !form.returnRouteId) {
        setError("בחרו קו חזור או סמנו שאין צורך בחזור.");
        return false;
      }
      if (!form.needsOutbound && !form.needsReturn) {
        setError("בחרו לפחות כיוון אחד להסעה.");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    if (step === 0 && needTransport === false) {
      setLocalNoTransport(true);
      setSubmitted(true);
      return;
    }
    if (step === 1 && !form.needsOutbound) {
      setStep(3);
      return;
    }
    if (step === 4 && !form.needsReturn) {
      setStep(6);
      return;
    }
    setStep((current) => Math.min(6, current + 1));
  }

  function prevStep() {
    setError("");
    if (step === 3 && !form.needsOutbound) {
      setStep(1);
      return;
    }
    if (step === 6 && !form.needsReturn) {
      setStep(4);
      return;
    }
    setStep((current) => Math.max(0, current - 1));
  }

  async function submit(waitlist = false) {
    setBusy(true);
    setError("");
    setCanJoinWaitlist(false);
    try {
      if (!form.name.trim()) {
        setError("שם מלא נדרש כדי לשמור את ההרשמה.");
        setBusy(false);
        return;
      }
      if (!form.needsOutbound && !form.needsReturn) {
        setError("בחרו לפחות הסעה הלוך או חזור.");
        setBusy(false);
        return;
      }

      const res = await fetch(`/api/invite/${shareId}/transportation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          passengerCount,
          token: guestToken || undefined,
          waitlist,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.error === "ROUTE_FULL") {
          const remaining = Number(data.remaining ?? 0);
          setLastRemaining(remaining);
          if (remaining > 0) {
            setError(`נשארו רק ${remaining} מקומות במסלול הזה. אפשר להפחית נוסעים או לבחור קו אחר.`);
          } else {
            setError("הקו התמלא ברגע זה. אפשר לבחור קו אחר.");
          }
          setCanJoinWaitlist(Boolean(data.waitlistAvailable));
        } else if (data?.error === "GUEST_ALREADY_REGISTERED") {
          setExisting(data.registration);
          setWaitlisted(data.registration?.status === "waitlisted");
          setSubmitted(true);
        } else if (data?.error === "WAITLIST_DISABLED") {
          setError("רשימת ההמתנה אינה פתוחה כרגע.");
        } else {
          setError("לא הצלחנו לשמור את ההרשמה. בדקו את הפרטים ונסו שוב.");
        }
        return;
      }

      setExisting(data.registration);
      setWaitlisted(Boolean(data.waitlisted || data.registration?.status === "waitlisted"));
      setSubmitted(true);
    } catch {
      setError("שגיאת רשת. נסו שוב בעוד רגע.");
    } finally {
      setBusy(false);
    }
  }

  function RouteCard({
    route,
    selected,
    onClick,
    leg = "outbound",
  }: {
    route: PublicRoute;
    selected: boolean;
    onClick: () => void;
    leg?: "outbound" | "return";
  }) {
    const useReturn =
      leg === "return" && route.direction === "round_trip";
    const level = normalizeLevel(
      useReturn ? route.returnLevel || route.level : route.level,
      route.legacyLevel
    );
    const remaining = remainingForLeg(route, leg);
    const capacity = useReturn
      ? Number(route.returnCapacity ?? route.capacity ?? 0)
      : route.capacity;
    const registered = useReturn
      ? Number(route.returnRegistered ?? route.registered ?? 0)
      : route.registered;
    const percent =
      capacity <= 0 ? 100 : Math.min(100, Math.round((registered / capacity) * 100));
    const clock =
      leg === "return"
        ? route.returnTime || route.departureTime || ""
        : route.departureTime || route.returnTime || "";
    return (
      <button
        type="button"
        onClick={onClick}
        className={`tg-route ${selected ? "is-selected" : ""} ${level}`}
      >
        <span className="tg-route-top">
          <strong>{route.name}</strong>
          <span>{clock || "שעה תתעדכן"}</span>
        </span>
        <span className="tg-route-cap">
          <span>{LEVEL_LABEL[level]}</span>
          <span>{remaining} מקומות פנויים</span>
        </span>
        <span className="tg-meter" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </span>
      </button>
    );
  }

  if (loading || !available) return null;

  if (submitted) {
    return (
      <section className="tg-shell" dir="rtl">
        <style>{styles}</style>
        <div className="tg-panel tg-confirmed">
          <div className="tg-kicker">מרכז הסעות</div>
          <h2>{localNoTransport ? "סימנו שאין צורך בהסעה" : waitlisted ? "נכנסתם לרשימת ההמתנה" : "ההרשמה להסעה נשמרה"}</h2>
          <p>
            {localNoTransport
              ? "לא נרשמה הסעה עבורכם. אם תשנו החלטה, אפשר לחזור לטופס מההזמנה."
              : waitlisted
                ? "הבקשה נשמרה בהמתנה. בעלי האירוע יאשרו ידנית אם יתפנו מקומות."
                : "הפרטים נשמרו במערכת ההסעות של האירוע."}
          </p>
          {existing ? (
            <div className="tg-summary">
              <div>
                <span>שם</span>
                <strong>{existing.name}</strong>
              </div>
              <div>
                <span>נוסעים</span>
                <strong>{existing.passengerCount}</strong>
              </div>
              <div>
                <span>כיוון</span>
                <strong>
                  {existing.needsOutbound ? "הלוך" : ""}
                  {existing.needsOutbound && existing.needsReturn ? " + " : ""}
                  {existing.needsReturn ? "חזור" : ""}
                </strong>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="tg-shell" dir="rtl">
      <style>{styles}</style>
      <div className="tg-panel">
        <div className="tg-head">
          <div>
            <div className="tg-kicker">Premium Travel Desk</div>
            <h2>הסעות לאירוע</h2>
            <p>
              {eventTitle ? `${eventTitle} · ` : ""}
              בחירת מסלול, תחנה וקיבולת בזמן אמת.
            </p>
          </div>
          <div className="tg-live">
            <span />
            Live
          </div>
        </div>

        {notes ? <div className="tg-notes">{notes}</div> : null}

        <div className="tg-progress">
          {["צורך", "הלוך", "איסוף", "נוסעים", "חזור", "הורדה", "אישור"].map(
            (label, index) => (
              <span key={label} className={index <= step ? "active" : ""}>
                {index + 1}. {label}
              </span>
            )
          )}
        </div>

        <div className="tg-body">
          {step === 0 && (
            <div className="tg-step">
              <h3>צריכים הסעה?</h3>
              <p>בחרו אם תרצו לשמור מקום במערך ההסעות של האירוע.</p>
              <div className="tg-choice-grid">
                <button
                  type="button"
                  onClick={() => {
                    setNeedTransport(true);
                    setForm((prev) => ({ ...prev, needsOutbound: true }));
                  }}
                  className={needTransport === true ? "selected" : ""}
                >
                  כן, אני רוצה הסעה
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNeedTransport(false);
                    setForm((prev) => ({
                      ...prev,
                      needsOutbound: false,
                      outboundRouteId: "",
                      outboundStopId: "",
                      needsReturn: false,
                      returnRouteId: "",
                      returnStopId: "",
                    }));
                  }}
                  className={needTransport === false ? "selected" : ""}
                >
                  לא צריך הסעה
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="tg-step">
              <h3>הסעה הלוך</h3>
              <p>בחרו אם תרצו להגיע באוטובוס, ואז בחרו מסלול.</p>
              <label className="tg-toggle">
                <input
                  type="checkbox"
                  checked={form.needsOutbound}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      needsOutbound: e.target.checked,
                      outboundRouteId: e.target.checked ? prev.outboundRouteId : "",
                      outboundStopId: e.target.checked ? prev.outboundStopId : "",
                    }))
                  }
                />
                אני צריך/ה הסעה הלוך
              </label>
              {form.needsOutbound ? (
                <div className="tg-routes">
                  {outboundRoutes.map((route) => (
                    <RouteCard
                      key={route._id}
                      route={route}
                      selected={form.outboundRouteId === route._id}
                      onClick={() => chooseRoute(route, "outbound")}
                    />
                  ))}
                  {outboundRoutes.length === 0 ? (
                    <div className="tg-empty">אין כרגע קווי הלוך זמינים.</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className="tg-step">
              <h3>נקודת איסוף</h3>
              <p>בחרו איפה נוח לכם לעלות להסעה.</p>
              {outboundStops.length > 0 ? (
                <div className="tg-stops">
                  {outboundStops.map((stop) => (
                    <button
                      type="button"
                      key={stop._id}
                      onClick={() => setForm((prev) => ({ ...prev, outboundStopId: stop._id }))}
                      className={form.outboundStopId === stop._id ? "selected" : ""}
                    >
                      <strong>
                        {stop.name}
                        {stop.time ? ` · ${stop.time}` : ""}
                      </strong>
                      <span>{stop.address || stop.landmark || "פרטי מיקום יישלחו בהמשך"}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="tg-empty">לקו הזה אין תחנות מוגדרות. אפשר להמשיך.</div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="tg-step">
              <h3>כמה נוסעים?</h3>
              <p>הקיבולת מחושבת בזמן אמת לפי המסלולים שבחרתם.</p>
              <div className="tg-count">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      passengerCount: String(Math.max(1, passengerCount - 1)),
                    }))
                  }
                >
                  -
                </button>
                <input
                  inputMode="numeric"
                  value={form.passengerCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, passengerCount: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      passengerCount: String(passengerCount + 1),
                    }))
                  }
                >
                  +
                </button>
              </div>
              <div className={`tg-capacity ${overCapacity ? "danger" : ""}`}>
                {selectedRemaining === null
                  ? "בחרו מסלול כדי לראות כמה מקומות נשארו."
                  : overCapacity
                    ? `נשארו רק ${selectedRemaining} מקומות במסלול שבחרתם.`
                    : `נשארו ${selectedRemaining} מקומות במסלול שבחרתם.`}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="tg-step">
              <h3>הסעה חזור</h3>
              <p>בחרו אם תרצו לחזור באוטובוס ובאיזו שעה.</p>
              <label className="tg-toggle">
                <input
                  type="checkbox"
                  checked={form.needsReturn}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      needsReturn: e.target.checked,
                      returnRouteId: e.target.checked ? prev.returnRouteId : "",
                      returnStopId: e.target.checked ? prev.returnStopId : "",
                    }))
                  }
                />
                אני צריך/ה הסעה חזור
              </label>
              {form.needsReturn ? (
                <div className="tg-routes">
                  {returnRoutes.map((route) => (
                    <RouteCard
                      key={route._id}
                      route={route}
                      leg="return"
                      selected={form.returnRouteId === route._id}
                      onClick={() => chooseRoute(route, "return")}
                    />
                  ))}
                  {returnRoutes.length === 0 ? (
                    <div className="tg-empty">אין כרגע קווי חזור זמינים.</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {step === 5 && (
            <div className="tg-step">
              <h3>נקודת הורדה</h3>
              <p>בחירה אופציונלית כדי לעזור לנהג ולמארגנים.</p>
              {returnStops.length > 0 ? (
                <div className="tg-stops">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, returnStopId: "" }))}
                    className={!form.returnStopId ? "selected" : ""}
                  >
                    <strong>לא משנה / אעדכן בהמשך</strong>
                    <span>אפשר להשאיר ריק</span>
                  </button>
                  {returnStops.map((stop) => (
                    <button
                      type="button"
                      key={stop._id}
                      onClick={() => setForm((prev) => ({ ...prev, returnStopId: stop._id }))}
                      className={form.returnStopId === stop._id ? "selected" : ""}
                    >
                      <strong>
                        {stop.name}
                        {stop.time ? ` · ${stop.time}` : ""}
                      </strong>
                      <span>{stop.address || stop.landmark || "נקודת הורדה"}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="tg-empty">לקו החזור אין נקודות הורדה מוגדרות. אפשר להמשיך.</div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="tg-step">
              <h3>אישור פרטים</h3>
              <p>בדקו שהכל נכון לפני שמירת המקום.</p>
              <div className="tg-fields">
                <input
                  placeholder="שם מלא"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  placeholder="טלפון"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="tg-summary">
                <div>
                  <span>נוסעים</span>
                  <strong>{passengerCount}</strong>
                </div>
                <div>
                  <span>הלוך</span>
                  <strong>{form.needsOutbound ? outboundRoute?.name || "לא נבחר" : "לא צריך"}</strong>
                </div>
                <div>
                  <span>איסוף</span>
                  <strong>
                    {form.needsOutbound
                      ? outboundStops.find((stop) => stop._id === form.outboundStopId)?.name || "ללא תחנה"
                      : "לא רלוונטי"}
                  </strong>
                </div>
                <div>
                  <span>חזור</span>
                  <strong>{form.needsReturn ? returnRoute?.name || "לא נבחר" : "לא צריך"}</strong>
                </div>
                <div>
                  <span>הורדה</span>
                  <strong>
                    {form.needsReturn
                      ? returnStops.find((stop) => stop._id === form.returnStopId)?.name || "אופציונלי"
                      : "לא רלוונטי"}
                  </strong>
                </div>
                <div>
                  <span>מקומות פנויים</span>
                  <strong>{selectedRemaining ?? "—"}</strong>
                </div>
              </div>
              <textarea
                placeholder="הערות למארגנים (אופציונלי)"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          )}
        </div>

        {error ? (
          <div className="tg-error">
            <strong>{error}</strong>
            {canJoinWaitlist && waitlistEnabled ? (
              <button type="button" disabled={busy} onClick={() => submit(true)}>
                הצטרפות לרשימת המתנה
              </button>
            ) : null}
            {lastRemaining !== null && lastRemaining > 0 ? (
              <span>אפשר גם להפחית את מספר הנוסעים ל-{lastRemaining}.</span>
            ) : null}
          </div>
        ) : null}

        <div className="tg-actions">
          {step > 0 ? (
            <button type="button" onClick={prevStep} className="secondary" disabled={busy}>
              חזרה
            </button>
          ) : (
            <span />
          )}
          {step < 6 ? (
            <button type="button" onClick={nextStep} disabled={busy}>
              המשך
            </button>
          ) : (
            <button type="button" onClick={() => submit(false)} disabled={busy}>
              {busy ? "שומרים..." : "שמירת הסעה"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

const styles = `
.tg-shell {
  width: 100%;
  max-width: 520px;
  margin: 28px auto 0;
  color: #1c2430;
  font-family: "Segoe UI", "Avenir Next", "Helvetica Neue", sans-serif;
}
.tg-shell * { box-sizing: border-box; }
.tg-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid #d7e0ec;
  border-radius: 32px;
  padding: 22px;
  background:
    radial-gradient(circle at 12% 0%, rgba(61, 126, 166, 0.1), transparent 36%),
    radial-gradient(circle at 90% 12%, rgba(184, 137, 63, 0.1), transparent 32%),
    linear-gradient(145deg, #ffffff, #f7f9fc 72%);
  box-shadow: 0 14px 36px rgba(28, 36, 48, 0.08);
}
.tg-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(184,137,63,0.06), transparent);
  transform: translateX(-70%);
  animation: tg-scan 7s linear infinite;
  pointer-events: none;
}
@keyframes tg-scan {
  to { transform: translateX(70%); }
}
.tg-head, .tg-body, .tg-progress, .tg-actions, .tg-notes, .tg-error { position: relative; z-index: 1; }
.tg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.tg-kicker {
  color: #b8893f;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.tg-head h2, .tg-confirmed h2 {
  margin: 8px 0 0;
  font-size: 30px;
  line-height: 1.05;
  font-weight: 950;
  color: #1c2430;
}
.tg-head p, .tg-confirmed p, .tg-step p {
  margin: 8px 0 0;
  color: #66768a;
  font-size: 14px;
  line-height: 1.55;
}
.tg-live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(47, 157, 120, 0.28);
  border-radius: 999px;
  padding: 7px 10px;
  color: #2f9d78;
  background: rgba(47, 157, 120, 0.1);
  font-size: 12px;
  font-weight: 900;
}
.tg-live span {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: #2f9d78;
  box-shadow: 0 0 0 0 rgba(47, 157, 120, 0.45);
  animation: tg-live 1.6s infinite;
}
@keyframes tg-live {
  70% { box-shadow: 0 0 0 10px rgba(47, 157, 120, 0); }
  100% { box-shadow: 0 0 0 0 rgba(47, 157, 120, 0); }
}
.tg-notes {
  margin-top: 16px;
  border: 1px solid rgba(184, 137, 63, 0.28);
  border-radius: 18px;
  padding: 12px;
  background: rgba(184, 137, 63, 0.1);
  color: #8a6a16;
  font-size: 13px;
  line-height: 1.55;
}
.tg-progress {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 18px 0 6px;
}
.tg-progress span {
  white-space: nowrap;
  border: 1px solid #d7e0ec;
  border-radius: 999px;
  padding: 7px 10px;
  color: #66768a;
  background: #f7f9fc;
  font-size: 11px;
  font-weight: 900;
}
.tg-progress span.active {
  color: #1a1208;
  border-color: transparent;
  background: linear-gradient(135deg, #d4a35c, #b8843f);
}
.tg-body { min-height: 330px; padding-top: 12px; }
.tg-step h3 {
  margin: 0;
  color: #1c2430;
  font-size: 24px;
  font-weight: 950;
}
.tg-choice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}
.tg-choice-grid button,
.tg-stops button,
.tg-route {
  width: 100%;
  border: 1px solid #d7e0ec;
  border-radius: 20px;
  padding: 15px;
  text-align: right;
  color: #1c2430;
  background: #ffffff;
  cursor: pointer;
  transition: border-color .2s ease, transform .2s ease, background .2s ease, box-shadow .2s ease;
}
.tg-choice-grid button:hover,
.tg-stops button:hover,
.tg-route:hover {
  transform: translateY(-1px);
  border-color: rgba(184, 137, 63, 0.55);
  box-shadow: 0 8px 18px rgba(28, 36, 48, 0.06);
}
.tg-choice-grid button.selected,
.tg-stops button.selected,
.tg-route.is-selected {
  border-color: #b8893f;
  background: rgba(184, 137, 63, 0.1);
  box-shadow: inset 0 0 0 1px rgba(184, 137, 63, 0.18);
}
.tg-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  border: 1px solid #d7e0ec;
  border-radius: 18px;
  padding: 12px;
  color: #1c2430;
  background: #f7f9fc;
  font-size: 14px;
  font-weight: 900;
}
.tg-routes, .tg-stops {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
.tg-route { display: block; }
.tg-route-top, .tg-route-cap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tg-route-top strong { color: #1c2430; font-size: 16px; }
.tg-route-top span, .tg-route-cap { color: #66768a; font-size: 12px; font-weight: 800; }
.tg-route-cap { margin-top: 10px; }
.tg-route.available .tg-route-cap span:first-child { color: #2f9d78; }
.tg-route.filling .tg-route-cap span:first-child { color: #c2922e; }
.tg-route.almost_full .tg-route-cap span:first-child { color: #c97a3a; }
.tg-route.full .tg-route-cap span:first-child { color: #c45b5b; }
.tg-meter {
  display: block;
  overflow: hidden;
  height: 6px;
  margin-top: 10px;
  border-radius: 99px;
  background: #e8eef6;
}
.tg-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2f9d78, #d4a35c, #c45b5b);
}
.tg-stops button strong, .tg-stops button span { display: block; }
.tg-stops button span { margin-top: 4px; color: #66768a; font-size: 12px; line-height: 1.45; }
.tg-count {
  display: grid;
  grid-template-columns: 52px 1fr 52px;
  gap: 10px;
  margin-top: 18px;
}
.tg-count button,
.tg-actions button,
.tg-error button {
  border: 0;
  border-radius: 16px;
  padding: 13px 16px;
  color: #1a1208;
  background: linear-gradient(135deg, #d4a35c, #b8843f);
  font-weight: 950;
  cursor: pointer;
}
.tg-count input,
.tg-fields input,
.tg-step textarea {
  width: 100%;
  border: 1px solid #d7e0ec;
  border-radius: 16px;
  padding: 13px 14px;
  color: #1c2430;
  background: #ffffff;
  font-size: 15px;
}
.tg-count input { text-align: center; font-size: 22px; font-weight: 950; }
.tg-capacity {
  margin-top: 14px;
  border: 1px solid rgba(47, 157, 120, 0.28);
  border-radius: 18px;
  padding: 12px;
  color: #1f6f56;
  background: rgba(47, 157, 120, 0.1);
  font-size: 14px;
  font-weight: 900;
}
.tg-capacity.danger {
  border-color: rgba(196, 91, 91, 0.35);
  color: #9a3030;
  background: rgba(196, 91, 91, 0.1);
}
.tg-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
.tg-step textarea {
  min-height: 88px;
  margin-top: 12px;
  resize: vertical;
}
.tg-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}
.tg-summary div {
  border: 1px solid #d7e0ec;
  border-radius: 16px;
  padding: 12px;
  background: #f7f9fc;
}
.tg-summary span {
  display: block;
  color: #66768a;
  font-size: 11px;
  font-weight: 900;
}
.tg-summary strong {
  display: block;
  margin-top: 4px;
  color: #1c2430;
  font-size: 14px;
}
.tg-error {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  border: 1px solid rgba(196, 91, 91, 0.35);
  border-radius: 18px;
  padding: 12px;
  color: #9a3030;
  background: rgba(196, 91, 91, 0.1);
  font-size: 13px;
  line-height: 1.5;
}
.tg-error button { justify-self: start; }
.tg-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}
.tg-actions button.secondary {
  color: #1c2430;
  border: 1px solid #d7e0ec;
  background: #ffffff;
}
.tg-actions button:disabled,
.tg-error button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.tg-empty {
  border: 1px dashed #d7e0ec;
  border-radius: 18px;
  padding: 16px;
  color: #66768a;
  background: #f7f9fc;
  text-align: center;
  font-size: 13px;
  font-weight: 800;
}
.tg-confirmed { text-align: center; }
.tg-confirmed .tg-summary { text-align: right; }
@media (max-width: 520px) {
  .tg-shell { max-width: 100%; }
  .tg-panel { border-radius: 26px; padding: 18px; }
  .tg-head { display: block; }
  .tg-live { margin-top: 12px; }
  .tg-choice-grid, .tg-fields, .tg-summary { grid-template-columns: 1fr; }
  .tg-body { min-height: 360px; }
}
`;

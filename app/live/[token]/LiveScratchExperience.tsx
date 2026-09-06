"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mission = {
  id: string;
  category: string;
  categoryLabel: string;
  text: string;
  hint?: string;
  boss?: boolean;
  hidden?: boolean;
};

type Giveaway = {
  visible: boolean;
  title: string;
  body: string;
  entriesLine: string;
};

type LivePayload = {
  success: boolean;
  screen: string;
  coupleNames?: string;
  guestName?: string;
  completedCount: number;
  maxMissions: number;
  skipEnabled?: boolean;
  skipRemaining?: number;
  mission: Mission | null;
  giveaway?: Giveaway;
  winner?: { name: string; prizeText: string } | null;
};

const DEMO: LivePayload = {
  success: true,
  screen: "intro",
  coupleNames: "נועה ויונתן",
  guestName: "אורח",
  completedCount: 0,
  maxMissions: 5,
  skipEnabled: true,
  skipRemaining: 1,
  mission: {
    id: "dancefloor-01",
    category: "dancefloor",
    categoryLabel: "משימת רחבה",
    text: "תרים/י 3 אנשים שיושבים כבר יותר מדי זמן ותביא/י אותם לרחבה.",
    hint: "עד סוף השיר",
    hidden: true,
  },
  giveaway: { visible: false, title: "", body: "", entriesLine: "" },
  winner: null,
};

const UNLOCK_RATIO = 0.58;
const FOIL_CLEAR_RATIO = 0.86;
const BRUSH_RADIUS = 22;

function paintGoldFoil(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#F8E7B4");
  base.addColorStop(0.18, "#E1B84A");
  base.addColorStop(0.42, "#C9962A");
  base.addColorStop(0.62, "#F3D27A");
  base.addColorStop(0.82, "#B8893A");
  base.addColorStop(1, "#E8C547");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#fff6d4";
  ctx.lineWidth = 12;
  for (let i = -height; i < width + height; i += 26) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  const sheen = ctx.createRadialGradient(width * 0.28, height * 0.22, 8, width * 0.4, height * 0.35, Math.max(width, height) * 0.7);
  sheen.addColorStop(0, "rgba(255,255,255,0.28)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.38)";
  for (let i = 0; i < 56; i += 1) {
    const x = ((i * 97) % 1000) / 1000 * width;
    const y = ((i * 53) % 1000) / 1000 * height;
    ctx.beginPath();
    ctx.arc(x, y, i % 5 === 0 ? 1.8 : 1.05, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.fillStyle = "rgba(74, 48, 12, 0.38)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.max(20, Math.min(30, width / 9))}px Heebo, sans-serif`;
  ctx.fillText("גרדו כאן", width / 2, height / 2 - 12);
  ctx.font = `600 ${Math.max(11, Math.min(14, width / 18))}px Heebo, sans-serif`;
  ctx.fillText("עד הסוף", width / 2, height / 2 + 16);
  ctx.restore();
}

function ScratchCard({
  initiallyRevealed,
  onUnlock,
  children,
}: {
  initiallyRevealed: boolean;
  onUnlock: () => void;
  children: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const sizeRef = useRef({ cssW: 0, cssH: 0 });
  const unlockedRef = useRef(initiallyRevealed);
  const foilGoneRef = useRef(initiallyRevealed);
  const moveCountRef = useRef(0);
  const [foilVisible, setFoilVisible] = useState(!initiallyRevealed);
  const [foilFading, setFoilFading] = useState(false);
  const [hintHidden, setHintHidden] = useState(initiallyRevealed);

  const paintCanvas = useCallback((cssW: number, cssH: number) => {
    const canvas = canvasRef.current;
    if (!canvas || foilGoneRef.current) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext("2d", { willReadFrequently: true, alpha: true });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintGoldFoil(ctx, cssW, cssH);
  }, []);

  const fitCanvas = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || foilGoneRef.current) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const prev = sizeRef.current;
    const widthChanged = Math.abs(rect.width - prev.cssW) > 2;
    const heightChanged = Math.abs(rect.height - prev.cssH) > 2;
    const firstPaint = prev.cssW === 0;
    if (!firstPaint && !widthChanged && !heightChanged) return;
    if (!firstPaint && moveCountRef.current > 0) return;
    sizeRef.current = { cssW: rect.width, cssH: rect.height };
    paintCanvas(rect.width, rect.height);
  }, [paintCanvas]);

  useEffect(() => {
    if (!foilVisible) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => fitCanvas());
    ro.observe(wrap);
    fitCanvas();
    return () => ro.disconnect();
  }, [fitCanvas, foilVisible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !foilVisible) return;
    const blockScroll = (event: TouchEvent) => {
      if (drawingRef.current) event.preventDefault();
    };
    canvas.addEventListener("touchstart", blockScroll, { passive: false });
    canvas.addEventListener("touchmove", blockScroll, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", blockScroll);
      canvas.removeEventListener("touchmove", blockScroll);
    };
  }, [foilVisible]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const measureClearRatio = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 0;
    const { width, height } = canvas;
    if (!width || !height) return 0;
    const data = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    let samples = 0;
    for (let i = 3; i < data.length; i += 16) {
      samples += 1;
      if (data[i] < 40) cleared += 1;
    }
    return samples ? cleared / samples : 0;
  };

  const retireFoil = () => {
    if (foilGoneRef.current) return;
    foilGoneRef.current = true;
    setFoilFading(true);
    window.setTimeout(() => setFoilVisible(false), 280);
  };

  const maybeProgress = () => {
    const ratio = measureClearRatio();
    if (ratio > 0.015) setHintHidden(true);
    if (!unlockedRef.current && ratio >= UNLOCK_RATIO) {
      unlockedRef.current = true;
      onUnlock();
    }
    if (ratio >= FOIL_CLEAR_RATIO) retireFoil();
  };

  const scratchTo = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || foilGoneRef.current) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const last = lastPointRef.current;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
    ctx.lineWidth = BRUSH_RADIUS * 2;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    lastPointRef.current = { x, y };
    moveCountRef.current += 1;
    if (moveCountRef.current === 1 || moveCountRef.current % 6 === 0) maybeProgress();
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = null;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* older Safari */
    }
    const point = pointFromEvent(event);
    if (point) scratchTo(point.x, point.y);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (point) scratchTo(point.x, point.y);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    maybeProgress();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="overflow-hidden rounded-[30px] border border-[#d7b56a] bg-[#fff8ea] shadow-[0_22px_48px_rgba(120,82,20,0.22)]">
      <div className="flex items-center justify-between border-b border-dashed border-[#e4c88a] bg-[linear-gradient(90deg,#f7e7b8,#ead08a,#f7e7b8)] px-4 py-2.5">
        <span className="text-[11px] font-black tracking-[0.18em] text-[#7a5316]">INVISTIMO</span>
        <span className="text-[11px] font-black text-[#7a5316]">כרטיס משימה</span>
        <span className="text-[11px] font-black tracking-[0.18em] text-[#7a5316]">LIVE</span>
      </div>
      <div ref={wrapRef} className="relative min-h-[320px]">
        <div className="flex min-h-[320px] flex-col items-center justify-center bg-[linear-gradient(180deg,#fffdf8_0%,#f6ead3_100%)] p-6 text-center">
          {children}
        </div>
        {foilVisible ? (
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 h-full w-full cursor-pointer touch-none select-none transition-opacity duration-300 ${
              foilFading ? "opacity-0" : "opacity-100"
            }`}
            style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        ) : null}
        {foilVisible && !hintHidden ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs font-bold text-[#5c3d12]/70">
            גרדו את הזהב עד הסוף
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ScreenCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[#ead9b4] bg-white/80 p-6 text-center shadow-[0_12px_30px_rgba(92,64,22,0.08)]">
      <h2 className="text-[26px] font-black leading-tight text-[#3b2a16]">{title}</h2>
      {subtitle ? (
        <p className="mt-3 text-base font-medium leading-relaxed text-[#7a6246]">{subtitle}</p>
      ) : null}
      {children}
    </div>
  );
}

export default function LiveScratchExperience({ token }: { token: string }) {
  const isDemo = token === "demo";
  const [data, setData] = useState<LivePayload | null>(isDemo ? DEMO : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [localRevealed, setLocalRevealed] = useState(false);

  const load = useCallback(async () => {
    if (isDemo) return;
    const res = await fetch(`/api/wedding-challenges/live/${token}`, { cache: "no-store" });
    const json = (await res.json()) as LivePayload;
    setData(json);
    setLocalRevealed(Boolean(json.mission && !json.mission.hidden && json.screen === "mission_revealed"));
  }, [isDemo, token]);

  useEffect(() => {
    load().catch(() => setError("לא הצלחנו לפתוח את הכרטיס"));
  }, [load]);

  const act = async (action: string) => {
    if (isDemo) {
      if (action === "scratch") {
        setLocalRevealed(true);
        setData((current) =>
          current
            ? {
                ...current,
                screen: "mission_revealed",
                mission: current.mission ? { ...current.mission, hidden: false } : current.mission,
              }
            : current
        );
        return;
      }
      if (action === "complete") {
        setData((current) =>
          current
            ? {
                ...current,
                screen: "completed",
                completedCount: current.completedCount + 1,
                giveaway: {
                  visible: true,
                  title: "הפתעה 🎁",
                  body: "כל משימה שהשלמתם מכניסה אתכם להגרלה",
                  entriesLine: `צברתם ${current.completedCount + 1} כניסות להגרלה 🎁`,
                },
              }
            : current
        );
        return;
      }
      if (action === "skip") {
        setLocalRevealed(false);
        setData({
          ...DEMO,
          completedCount: data?.completedCount || 0,
          skipEnabled: false,
          skipRemaining: 0,
          screen: "intro",
          mission: {
            id: "chaos-01",
            category: "chaos",
            categoryLabel: "משימת כאוס",
            text: "יש לך 60 שניות להקים 7 אנשים שיושבים.",
            hint: "60 שניות",
            hidden: true,
          },
        });
        return;
      }
      if (action === "next") {
        setLocalRevealed(false);
        setData({
          ...DEMO,
          completedCount: Math.max(data?.completedCount || 1, 1),
          screen: "intro",
          mission: {
            id: "chaos-01",
            category: "chaos",
            categoryLabel: "משימת כאוס",
            text: "יש לך 60 שניות להקים 7 אנשים שיושבים.",
            hint: "60 שניות",
            hidden: true,
          },
        });
        return;
      }
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/wedding-challenges/live/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as LivePayload;
      if (!res.ok || json.success === false) {
        setError("לא הצלחנו לעדכן את המשימה");
      } else {
        setData(json);
        if (action === "scratch") {
          setLocalRevealed(true);
        } else {
          setLocalRevealed(Boolean(json.mission && !json.mission.hidden));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f1e6] text-[#7a6246]">
        טוען את הכרטיס...
      </div>
    );
  }

  const revealed = localRevealed || data.screen === "mission_revealed";
  const progressLabel = `משימה ${Math.min(data.completedCount + (data.mission ? 1 : 0), data.maxMissions)} מתוך ${data.maxMissions}`;
  const startWithoutFoil = Boolean(data.mission && !data.mission.hidden);

  return (
    <div
      dir="rtl"
      className="relative min-h-dvh overflow-hidden bg-[#f6efe6] text-[#3b2a16]"
      style={{
        overscrollBehavior: "none",
        backgroundImage:
          "radial-gradient(circle at top, rgba(232,201,122,0.28), transparent 42%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.7), transparent 30%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-1.5 w-1.5 rounded-full bg-[#d4b36a]"
            style={{
              top: `${(index * 17) % 100}%`,
              right: `${(index * 23) % 100}%`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
        <header className="mb-6 text-center">
          <p
            className="text-[13px] font-bold tracking-[0.26em] text-[#b8893a]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            INVISTIMO LIVE
          </p>
          <p className="mt-1 text-xs text-[#8b7358]">{data.coupleNames}</p>
        </header>

        {data.screen === "not_started" && (
          <ScreenCard title="המשחק עוד לא התחיל" subtitle="כרטיס הגירוד ייפתח כשהאירוע יתחיל" />
        )}

        {data.screen === "ended" && (
          <ScreenCard title="המשחק הסתיים" subtitle="תודה שהרמתם את הרחבה" />
        )}

        {data.screen === "winner" && (
          <ScreenCard
            title="יש זוכה 🎉"
            subtitle={
              data.winner?.prizeText
                ? `${data.winner.name} זכה/תה ב${data.winner.prizeText}`
                : `${data.winner?.name || "אורח"} זכה/תה בהגרלה`
            }
          />
        )}

        {(data.screen === "intro" || data.screen === "mission_revealed") && data.mission && (
          <>
            <div className="mb-4 text-center">
              <h1 className="text-[28px] font-black leading-tight">כרטיס הגירוד שלך</h1>
              <p className="mt-2 text-base text-[#7a6246]">גרדו את שכבת הזהב עד הסוף כדי לגלות את המשימה ♡</p>
              <p className="mt-2 text-sm font-bold text-[#b8893a]">{progressLabel}</p>
            </div>

            <ScratchCard
              key={data.mission.id}
              initiallyRevealed={startWithoutFoil}
              onUnlock={() => {
                if (!revealed) void act("scratch");
              }}
            >
              <span className="rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-black text-[#b07a22]">
                {data.mission.categoryLabel}
              </span>
              <p className="mt-4 text-[22px] font-black leading-snug text-[#3b2a16]">{data.mission.text}</p>
              {data.mission.hint ? (
                <p className="mt-4 text-sm font-bold text-[#8b7358]">⏱ {data.mission.hint}</p>
              ) : null}
            </ScratchCard>

            {revealed && (
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act("complete")}
                  className="w-full rounded-full bg-[linear-gradient(90deg,#e7c57a,#c8963a)] py-4 text-lg font-black text-white shadow-[0_12px_24px_rgba(168,111,43,0.28)]"
                >
                  בוצע! ✅
                </button>
                {data.skipEnabled ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act("skip")}
                    className="w-full rounded-full border border-[#e0c48a] bg-white py-3 text-sm font-bold text-[#8b7358]"
                  >
                    להחליף משימה
                  </button>
                ) : null}
              </div>
            )}
          </>
        )}

        {data.screen === "completed" && (
          <ScreenCard title="בוצע מצוין 🎉" subtitle="הרמתם את הרחבה">
            <p className="mt-3 text-sm font-bold text-[#b8893a]">
              {data.completedCount} מתוך {data.maxMissions} הושלמו
            </p>
            {data.giveaway?.visible ? (
              <div className="mt-4 rounded-2xl bg-[#fff6e3] p-4">
                <p className="font-black">{data.giveaway.title}</p>
                <p className="mt-1 text-sm text-[#7a6246]">{data.giveaway.body}</p>
              </div>
            ) : null}
            {data.completedCount < data.maxMissions ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => act("next")}
                className="mt-5 w-full rounded-full border border-[#e0c48a] bg-white py-3 font-black text-[#3b2a16]"
              >
                גירוד נוסף
              </button>
            ) : null}
          </ScreenCard>
        )}

        {data.screen === "giveaway_revealed" && (
          <ScreenCard title="הפתעה 🎁" subtitle="כל משימה שהשלמתם מכניסה אתכם להגרלה">
            <p className="mt-3 font-bold text-[#b8893a]">{data.giveaway?.entriesLine}</p>
            {data.completedCount < data.maxMissions ? (
              <button
                type="button"
                onClick={() => act("next")}
                className="mt-5 w-full rounded-full bg-[linear-gradient(90deg,#e7c57a,#c8963a)] py-4 font-black text-white"
              >
                משימה הבאה
              </button>
            ) : null}
          </ScreenCard>
        )}

        {(data.screen === "max_reached" || data.screen === "no_more") && (
          <ScreenCard
            title="סיימתם את כל המשימות שלכם 🎉"
            subtitle="תודה שהרמתם את הרחבה"
          >
            {data.giveaway?.visible ? (
              <p className="mt-4 font-bold text-[#b8893a]">{data.giveaway.entriesLine}</p>
            ) : null}
          </ScreenCard>
        )}

        {error ? <p className="mt-4 text-center text-sm text-rose-600">{error}</p> : null}

        <p className="mt-auto pt-8 text-center text-xs text-[#8b7358]">
          Invistimo · הופכים אירועים לחוויות בלתי נשכחות
        </p>
      </div>
    </div>
  );
}

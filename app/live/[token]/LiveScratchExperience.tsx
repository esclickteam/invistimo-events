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

function goldFill(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f3e0b0");
  gradient.addColorStop(0.45, "#d4b36a");
  gradient.addColorStop(1, "#b8893a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 80; i += 1) {
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ScratchCard({
  revealed,
  onReveal,
  children,
}: {
  revealed: boolean;
  onReveal: () => void;
  children: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    goldFill(ctx, width, height);
    ctx.fillStyle = "rgba(90, 58, 18, 0.72)";
    ctx.font = "600 18px Heebo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("גרדו כאן", width / 2, height / 2 + 6);
  }, [revealed]);

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealedRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 40) cleared += 1;
    }
    if (cleared / (pixels.length / 4) > 0.42) {
      revealedRef.current = true;
      onReveal();
    }
  };

  const pointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    scratch(event.clientX - rect.left, event.clientY - rect.top);
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#e6c98a] shadow-[0_18px_40px_rgba(120,82,20,0.18)]">
      <div className="min-h-[280px] bg-[linear-gradient(180deg,#fffaf1_0%,#f6ead3_100%)] p-5">
        {children}
      </div>
      {!revealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none cursor-pointer"
          onPointerDown={pointer}
          onPointerMove={(event) => {
            if (event.buttons) pointer(event);
          }}
        />
      )}
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
                completedCount: 1,
                giveaway: {
                  visible: true,
                  title: "הפתעה 🎁",
                  body: "כל משימה שהשלמתם מכניסה אתכם להגרלה",
                  entriesLine: "צברתם 1 כניסות להגרלה 🎁",
                },
              }
            : current
        );
        return;
      }
      if (action === "next") {
        setLocalRevealed(false);
        setData({
          ...DEMO,
          completedCount: 1,
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
        setLocalRevealed(Boolean(json.mission && !json.mission.hidden));
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

  return (
    <div
      dir="rtl"
      className="relative min-h-dvh overflow-hidden bg-[#f6efe6] text-[#3b2a16]"
      style={{
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
        <header className="mb-6 flex items-center justify-between">
          <span className="text-xl">✨</span>
          <div className="text-center">
            <p className="text-sm font-bold tracking-[0.18em] text-[#b8893a]">INVISTIMO LIVE</p>
            <p className="text-xs text-[#8b7358]">{data.coupleNames}</p>
          </div>
          <span className="text-xl">☰</span>
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
              <h1 className="text-[28px] font-black leading-tight">כרטיס הגירוד שלך מחכה</h1>
              <p className="mt-2 text-base text-[#7a6246]">גרדו כדי לגלות מה קיבלתם ♡</p>
              <p className="mt-2 text-sm font-bold text-[#b8893a]">{progressLabel}</p>
            </div>

            <ScratchCard revealed={revealed} onReveal={() => act("scratch")}>
              <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                <span className="rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-black text-[#b07a22]">
                  {data.mission.categoryLabel}
                </span>
                <p className="mt-4 text-[22px] font-black leading-snug text-[#3b2a16]">
                  {revealed ? data.mission.text : "המשימה מחכה מתחת לזהב"}
                </p>
                {revealed && data.mission.hint ? (
                  <p className="mt-4 text-sm font-bold text-[#8b7358]">⏱ {data.mission.hint}</p>
                ) : null}
              </div>
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

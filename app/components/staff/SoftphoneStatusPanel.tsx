"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AgentStatus =
  | "available"
  | "dialing"
  | "ringing"
  | "in_call"
  | "after_call"
  | "break"
  | "unavailable"
  | "offline";

type CallDirection = "none" | "outbound" | "inbound";

type BusyReason =
  | "outbound_call"
  | "after_call"
  | "back_office"
  | "manager_approval"
  | "break"
  | "personal"
  | "technical"
  | "unavailable";

type RecentCall = {
  id: string;
  number: string;
  label?: string;
  direction: "outbound" | "inbound";
  time: string;
  duration?: number;
};

type AgentState = {
  agentId: string;
  name?: string;
  email?: string;
  status: AgentStatus;
  statusStartedAt: string;
  currentCallId?: string | null;
  todayAvailableSeconds: number;
  todayDialingSeconds: number;
  todayRingingSeconds: number;
  todayTalkSeconds: number;
  todayAfterCallSeconds: number;
  todayBreakSeconds: number;
  todayUnavailableSeconds: number;
  todayOfflineSeconds: number;
  totalCallsToday: number;
  answeredCallsToday: number;
  missedCallsToday: number;
  failedCallsToday: number;
  lastSeenAt?: string;
};

type WebrtcAuthResponse = {
  success?: boolean;
  authType?: "credentials" | "token";
  login?: string;
  username?: string;
  password?: string;
  loginToken?: string;
  token?: string;
  connectionId?: string;
  callerNumber?: string;
  fromNumber?: string;
  error?: string;
};

type TelnyxRtcClient = {
  connect?: () => void;
  disconnect?: () => void;
  newCall?: (options: Record<string, unknown>) => TelnyxRtcCall;
  on?: (eventName: string, handler: (...args: any[]) => void) => void;
  off?: (eventName: string, handler: (...args: any[]) => void) => void;
};

type TelnyxRtcCall = {
  id?: string;
  state?: string;
  direction?: string;
  options?: Record<string, any>;
  remoteStream?: MediaStream;
  answer?: (options?: Record<string, unknown>) => void;
  hangup?: () => void;
  muteAudio?: () => void;
  unmuteAudio?: () => void;
};

type IconName =
  | "play"
  | "stop"
  | "phone"
  | "phonePlus"
  | "headset"
  | "keypad"
  | "clock"
  | "mic"
  | "speaker"
  | "pause"
  | "transfer"
  | "user"
  | "x"
  | "delete"
  | "check"
  | "minus"
  | "arrowOut"
  | "arrowIn"
  | "coffee"
  | "briefcase"
  | "shield"
  | "dotGrid"
  | "search"
  | "wave"
  | "chevronLeft"
  | "message"
  | "activity";

const TELNYX_DEFAULT_CALLER_NUMBER = "+97283761556";

const STATUS_LABELS: Record<AgentStatus, string> = {
  available: "פנוי",
  dialing: "מחייג",
  ringing: "שיחה נכנסת",
  in_call: "בשיחה",
  after_call: "טיפול אחרי שיחה",
  break: "הפסקה",
  unavailable: "לא פנוי",
  offline: "מחוץ למשמרת",
};

const BUSY_REASONS: {
  value: BusyReason;
  label: string;
  targetStatus: AgentStatus;
}[] = [
  { value: "after_call", label: "טיפול אחרי שיחה", targetStatus: "after_call" },
  { value: "back_office", label: "בק אופיס", targetStatus: "unavailable" },
  { value: "manager_approval", label: "אישור מנהל", targetStatus: "unavailable" },
  { value: "break", label: "הפסקה", targetStatus: "break" },
  { value: "personal", label: "אישי", targetStatus: "unavailable" },
  { value: "technical", label: "תקלה טכנית", targetStatus: "unavailable" },
  { value: "unavailable", label: "לא זמין", targetStatus: "unavailable" },
];

const DIAL_KEYS = [
  { key: "1", letters: "" },
  { key: "2", letters: "ABC" },
  { key: "3", letters: "DEF" },
  { key: "4", letters: "GHI" },
  { key: "5", letters: "JKL" },
  { key: "6", letters: "MNO" },
  { key: "7", letters: "PQRS" },
  { key: "8", letters: "TUV" },
  { key: "9", letters: "WXYZ" },
  { key: "*", letters: "" },
  { key: "0", letters: "+" },
  { key: "#", letters: "" },
];

const DEFAULT_RECENT_CALLS: RecentCall[] = [
  {
    id: "1",
    number: "03-9876543",
    label: "יוצאת",
    direction: "outbound",
    time: "10:32",
    duration: 142,
  },
  {
    id: "2",
    number: "050-1234567",
    label: "שיחה נענתה",
    direction: "inbound",
    time: "10:21",
    duration: 318,
  },
  {
    id: "3",
    number: "08-7654321",
    label: "נכנסת",
    direction: "inbound",
    time: "09:47",
    duration: 201,
  },
  {
    id: "4",
    number: "04-1234567",
    label: "יוצאת",
    direction: "outbound",
    time: "09:15",
    duration: 88,
  },
];

const quickActions: {
  icon: IconName;
  title: string;
  type?: "mute" | "speaker" | "dialer";
}[] = [
  { icon: "headset", title: "אוזניות" },
  { icon: "keypad", title: "מקשים", type: "dialer" },
  { icon: "clock", title: "היסטוריה", type: "dialer" },
  { icon: "mic", title: "השתק", type: "mute" },
  { icon: "speaker", title: "רמקול", type: "speaker" },
  { icon: "pause", title: "המתנה" },
  { icon: "transfer", title: "העברה" },
  { icon: "user", title: "איש קשר" },
];

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}

function formatShortDuration(totalSeconds?: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function secondsSince(value?: string | null) {
  if (!value) return 0;

  const start = new Date(value).getTime();
  const now = Date.now();
  const diff = Math.floor((now - start) / 1000);

  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function onlyDialChars(value: string) {
  return value.replace(/[^\d*#+-]/g, "");
}

function normalizeDialNumber(value: string) {
  return value.replace(/[^\d*#+]/g, "");
}

function getBusyReasonLabel(reason?: BusyReason | null) {
  if (!reason) return "";
  return BUSY_REASONS.find((item) => item.value === reason)?.label || "";
}

function getTimerLabel(status: AgentStatus, reason?: BusyReason | null) {
  if (status === "dialing") return "זמן חיוג";
  if (status === "ringing") return "זמן צלצול";
  if (status === "in_call") return "זמן שיחה";
  if (status === "after_call") return "טיפול אחרי שיחה";
  if (status === "break" || reason === "break") return "משך הפסקה";
  if (status === "available") return "זמן פנוי";
  if (status === "offline") return "מחוץ למשמרת";
  return getBusyReasonLabel(reason) || "זמן לא פנוי";
}

function getStatusStyles(status: AgentStatus) {
  if (status === "available") {
    return {
      dot: "bg-emerald-400 shadow-emerald-400/30",
      pill: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
      glow: "from-emerald-500/25 via-emerald-400/5 to-transparent",
      icon: "bg-emerald-400 text-slate-950",
    };
  }

  if (status === "dialing") {
    return {
      dot: "bg-sky-400 shadow-sky-400/30",
      pill: "border-sky-400/20 bg-sky-400/10 text-sky-100",
      glow: "from-sky-500/25 via-sky-400/5 to-transparent",
      icon: "bg-sky-400 text-slate-950",
    };
  }

  if (status === "ringing") {
    return {
      dot: "bg-violet-400 shadow-violet-400/30",
      pill: "border-violet-400/20 bg-violet-400/10 text-violet-100",
      glow: "from-violet-500/25 via-violet-400/5 to-transparent",
      icon: "bg-violet-400 text-slate-950",
    };
  }

  if (status === "in_call") {
    return {
      dot: "bg-rose-400 shadow-rose-400/30",
      pill: "border-rose-400/20 bg-rose-400/10 text-rose-100",
      glow: "from-rose-500/25 via-rose-400/5 to-transparent",
      icon: "bg-rose-400 text-slate-950",
    };
  }

  if (status === "after_call" || status === "break" || status === "unavailable") {
    return {
      dot: "bg-amber-400 shadow-amber-400/30",
      pill: "border-amber-400/20 bg-amber-400/10 text-amber-100",
      glow: "from-amber-500/25 via-amber-400/5 to-transparent",
      icon: "bg-amber-400 text-slate-950",
    };
  }

  return {
    dot: "bg-slate-500 shadow-slate-500/30",
    pill: "border-white/10 bg-white/5 text-slate-300",
    glow: "from-slate-500/20 via-white/5 to-transparent",
    icon: "bg-slate-700 text-slate-200",
  };
}

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "play") {
    return (
      <svg {...common}>
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  }

  if (name === "stop") {
    return (
      <svg {...common}>
        <rect x="7" y="7" width="10" height="10" rx="2" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L9 10.7a16 16 0 0 0 4.3 4.3l1.25-1.25a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "phonePlus") {
    return (
      <svg {...common}>
        <path d="M15 5h6" />
        <path d="M18 2v6" />
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L9 10.7a16 16 0 0 0 4.3 4.3l1.25-1.25a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "headset") {
    return (
      <svg {...common}>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M4 13v4a2 2 0 0 0 2 2h2v-8H6a2 2 0 0 0-2 2z" />
        <path d="M20 13v4a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2z" />
        <path d="M13 21h3" />
      </svg>
    );
  }

  if (name === "keypad" || name === "dotGrid") {
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="1" />
        <circle cx="12" cy="6" r="1" />
        <circle cx="18" cy="6" r="1" />
        <circle cx="6" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="18" cy="12" r="1" />
        <circle cx="6" cy="18" r="1" />
        <circle cx="12" cy="18" r="1" />
        <circle cx="18" cy="18" r="1" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "mic") {
    return (
      <svg {...common}>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
      </svg>
    );
  }

  if (name === "speaker") {
    return (
      <svg {...common}>
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
    );
  }

  if (name === "pause") {
    return (
      <svg {...common}>
        <path d="M9 5v14" />
        <path d="M15 5v14" />
      </svg>
    );
  }

  if (name === "transfer") {
    return (
      <svg {...common}>
        <path d="M7 7h11l-3-3" />
        <path d="m18 7-3 3" />
        <path d="M17 17H6l3 3" />
        <path d="m6 17 3-3" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg {...common}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    );
  }

  if (name === "delete") {
    return (
      <svg {...common}>
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
        <path d="m18 9-6 6" />
        <path d="m12 9 6 6" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "minus") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === "arrowOut") {
    return (
      <svg {...common}>
        <path d="M7 17 17 7" />
        <path d="M8 7h9v9" />
      </svg>
    );
  }

  if (name === "arrowIn") {
    return (
      <svg {...common}>
        <path d="M17 7 7 17" />
        <path d="M16 17H7V8" />
      </svg>
    );
  }

  if (name === "coffee") {
    return (
      <svg {...common}>
        <path d="M5 8h10v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" />
        <path d="M15 9h2a2 2 0 1 1 0 4h-2" />
        <path d="M6 21h10" />
      </svg>
    );
  }

  if (name === "briefcase") {
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }

  if (name === "wave") {
    return (
      <svg {...common}>
        <path d="M4 12h2l2-7 4 14 3-9 2 2h3" />
      </svg>
    );
  }

  if (name === "chevronLeft") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...common}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    );
  }

  if (name === "activity") {
    return (
      <svg {...common}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ReasonIcon({ reason }: { reason: BusyReason }) {
  if (reason === "break") return <Icon name="coffee" className="h-4 w-4" />;
  if (reason === "back_office") {
    return <Icon name="briefcase" className="h-4 w-4" />;
  }
  if (reason === "manager_approval") {
    return <Icon name="shield" className="h-4 w-4" />;
  }
  if (reason === "after_call") return <Icon name="headset" className="h-4 w-4" />;
  return <Icon name="minus" className="h-4 w-4" />;
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.055] px-3 py-3">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-lg font-black tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

export default function SoftphoneStatusPanel() {
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AgentStatus | null>(null);
  const [creatingCall, setCreatingCall] = useState(false);
  const [webrtcReady, setWebrtcReady] = useState(false);
  const [webrtcConnecting, setWebrtcConnecting] = useState(false);
  const [webrtcError, setWebrtcError] = useState("");
  const [muted, setMuted] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);

  const telnyxClientRef = useRef<TelnyxRtcClient | null>(null);
  const activeCallRef = useRef<TelnyxRtcCall | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  const [tick, setTick] = useState(0);

  const [shiftStarted, setShiftStarted] = useState(false);
  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeCallNumber, setActiveCallNumber] = useState("");
  const [callDirection, setCallDirection] = useState<CallDirection>("none");

  const [busyReason, setBusyReason] = useState<BusyReason | "">("");
  const [activeBusyReason, setActiveBusyReason] = useState<BusyReason | null>(null);

  const [showDialer, setShowDialer] = useState(false);
  const [showBusyMenu, setShowBusyMenu] = useState(false);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>(DEFAULT_RECENT_CALLS);

  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallNumber, setIncomingCallNumber] = useState("");

  useEffect(() => {
    loadMyStatus();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showDialer || !shiftStarted) return;

    const timeout = window.setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [showDialer, shiftStarted]);

  useEffect(() => {
    if (!showDialer || !shiftStarted) return;

    function handlePhysicalKeyboard(event: KeyboardEvent) {
      if (savingStatus || creatingCall) return;

      const key = event.key;
      const activeElement = document.activeElement;
      const isTypingInPhoneInput = activeElement === phoneInputRef.current;
      const isTypingInOtherInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;

      if (key === "Enter") {
        event.preventDefault();
        void startOutboundCall();
        return;
      }

      if (key === "Escape") {
        event.preventDefault();
        setShowDialer(false);
        return;
      }

      if (isTypingInPhoneInput) return;
      if (isTypingInOtherInput) return;

      if (/^\d$/.test(key) || key === "*" || key === "#" || key === "+") {
        event.preventDefault();
        appendDigit(key);
        return;
      }

      if (key === "Backspace") {
        event.preventDefault();
        removeLastDigit();
      }
    }

    window.addEventListener("keydown", handlePhysicalKeyboard);

    return () => {
      window.removeEventListener("keydown", handlePhysicalKeyboard);
    };
  }, [showDialer, shiftStarted, savingStatus, creatingCall, phoneNumber]);

  useEffect(() => {
    return () => {
      try {
        activeCallRef.current?.hangup?.();
      } catch {
        // ignore cleanup hangup errors
      }

      try {
        telnyxClientRef.current?.disconnect?.();
      } catch {
        // ignore cleanup disconnect errors
      }
    };
  }, []);

  async function loadMyStatus() {
    try {
      setLoading(true);

      const res = await fetch("/api/staff/softphone/status", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "LOAD_STATUS_FAILED");
      }

      setAgent(data.agent);

      const savedStatus = data.agent?.status as AgentStatus | undefined;
      const shouldRestoreShift = savedStatus && savedStatus !== "offline";

      if (shouldRestoreShift) {
        setShiftStarted(true);
        setShiftStartedAt(data.agent.statusStartedAt || new Date().toISOString());

        window.setTimeout(() => {
          void connectWebrtc().catch((error) => {
            console.error("AUTO CONNECT WEBRTC AFTER STATUS LOAD FAILED:", error);
          });
        }, 100);
      } else {
        setShiftStarted(false);
        setShiftStartedAt(null);
      }
    } catch (err) {
      console.error("LOAD SOFTPHONE STATUS FAILED:", err);
    } finally {
      setLoading(false);
    }
  }

  function ensureShiftStarted() {
    if (!shiftStarted) {
      setShiftStarted(true);
      setShiftStartedAt(new Date().toISOString());
    }
  }

  async function changeStatus(
    nextStatus: AgentStatus,
    options?: {
      reason?: BusyReason | null;
      number?: string | null;
      direction?: CallDirection;
      autoStartShift?: boolean;
    }
  ) {
    if (savingStatus) return;

    const shouldAutoStartShift = options?.autoStartShift !== false;

    try {
      if (nextStatus !== "offline" && shouldAutoStartShift) {
        ensureShiftStarted();
      }

      setSavingStatus(nextStatus);

      const res = await fetch("/api/staff/softphone/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: nextStatus,
          reason: options?.reason || null,
          phoneNumber: options?.number || activeCallNumber || phoneNumber || null,
          direction: options?.direction || callDirection,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "CHANGE_STATUS_FAILED");
      }

      setAgent((prev) => {
        if (data.agent) return data.agent as AgentState;
        return prev;
      });
    } catch (err) {
      console.error("CHANGE SOFTPHONE STATUS FAILED:", err);
      alert("שגיאה בעדכון סטטוס");
    } finally {
      setSavingStatus(null);
    }
  }

  async function startShift() {
    if (savingStatus || webrtcConnecting) return;

    try {
      await connectWebrtc();

      setShiftStarted(true);
      setShiftStartedAt(new Date().toISOString());
      setCallDirection("none");
      setActiveCallNumber("");
      setActiveBusyReason(null);
      setBusyReason("");
      setShowDialer(false);
      setShowBusyMenu(false);

      await changeStatus("available", {
        direction: "none",
        number: null,
        reason: null,
        autoStartShift: false,
      });
    } catch {
      alert("לא הצלחנו לחבר את הסופטפון בדפדפן. בדקי הרשאת מיקרופון ו־ENV של Telnyx.");
    }
  }

  function requestEndShift() {
    if (!shiftStarted || savingStatus) return;
    setShowEndShiftConfirm(true);
    setShowDialer(false);
    setShowBusyMenu(false);
  }

  async function confirmEndShift() {
    if (savingStatus) return;

    disconnectWebrtc();

    setShowEndShiftConfirm(false);
    setShiftStarted(false);
    setShiftStartedAt(null);
    setCallDirection("none");
    setActiveCallNumber("");
    setActiveBusyReason(null);
    setBusyReason("");
    setShowDialer(false);
    setShowBusyMenu(false);
    setPhoneNumber("");
    setShowIncomingCallModal(false);
    setIncomingCallNumber("");

    await changeStatus("offline", {
      direction: "none",
      number: null,
      reason: null,
      autoStartShift: false,
    });
  }

  async function setAvailable() {
    if (savingStatus) return;

    ensureShiftStarted();

    setCallDirection("none");
    setActiveCallNumber("");
    setActiveBusyReason(null);
    setBusyReason("");
    setShowDialer(false);
    setShowBusyMenu(false);
    setShowIncomingCallModal(false);
    setIncomingCallNumber("");

    await changeStatus("available", {
      direction: "none",
      number: null,
      reason: null,
    });
  }

  async function handleBusyReasonChange(value: BusyReason) {
    if (savingStatus) return;

    const selected = BUSY_REASONS.find((item) => item.value === value);
    if (!selected) return;

    ensureShiftStarted();

    setBusyReason(value);
    setActiveBusyReason(value);
    setShowBusyMenu(false);
    setShowDialer(false);
    setCallDirection("none");
    setActiveCallNumber("");
    setShowIncomingCallModal(false);
    setIncomingCallNumber("");

    await changeStatus(selected.targetStatus, {
      reason: value,
      direction: "none",
      number: null,
    });
  }

  function openAddCall() {
    if (!shiftStarted) {
      void startShift();
      return;
    }

    setActiveBusyReason("outbound_call");
    setBusyReason("");
    setCallDirection("outbound");
    setShowEndShiftConfirm(false);
    setShowBusyMenu(false);
    setShowIncomingCallModal(false);
    setIncomingCallNumber("");
    setShowDialer(true);
  }

  function toggleDialer() {
    if (!shiftStarted) return;

    setActiveBusyReason("outbound_call");
    setCallDirection("outbound");
    setShowEndShiftConfirm(false);
    setShowBusyMenu(false);
    setShowIncomingCallModal(false);
    setIncomingCallNumber("");
    setShowDialer((prev) => !prev);
  }

  function selectRecentCall(call: RecentCall) {
    setPhoneNumber(call.number);
    setActiveBusyReason("outbound_call");
    setCallDirection("outbound");
    setShowDialer(true);
    setShowBusyMenu(false);
  }

  function addRecentCall(number: string, direction: RecentCall["direction"]) {
    const clean = number.trim();
    if (!clean) return;

    const now = new Date();
    const time = now.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setRecentCalls((prev) => {
      const withoutDuplicate = prev.filter((item) => item.number !== clean);

      return [
        {
          id: `${Date.now()}`,
          number: clean,
          label: direction === "outbound" ? "יוצאת" : "נכנסת",
          direction,
          time,
          duration: 0,
        },
        ...withoutDuplicate,
      ].slice(0, 5);
    });
  }

  function getCallNumber(call?: TelnyxRtcCall | null, fallback = "") {
    const options = call?.options || {};

    return (
      String(options.remoteCallerNumber || "") ||
      String(options.callerNumber || "") ||
      String(options.destinationNumber || "") ||
      fallback ||
      ""
    );
  }

  function isInboundWebrtcCall(call?: TelnyxRtcCall | null, notification?: any) {
    const direction = [
      call?.direction,
      call?.options?.direction,
      notification?.direction,
      notification?.call?.direction,
      notification?.params?.direction,
      notification?.data?.direction,
    ]
      .map((value) => String(value || "").toLowerCase())
      .find(Boolean);

    return direction === "inbound" || direction === "incoming";
  }

  function handleWebrtcNotification(notification: any) {
    console.log("RAW TELNYX NOTIFICATION:", notification);

    const call = (notification?.call || notification) as TelnyxRtcCall | null;

    const callState = String(
      call?.state ||
        notification?.state ||
        notification?.call?.state ||
        notification?.params?.state ||
        notification?.data?.state ||
        ""
    ).toLowerCase();

    if (!call) {
      console.warn("TELNYX NOTIFICATION WITHOUT CALL OBJECT:", notification);
      return;
    }

    const inbound = isInboundWebrtcCall(call, notification);
    const number = getCallNumber(call, activeCallNumber || phoneNumber || "");

    console.log("TELNYX WEBRTC NOTIFICATION:", {
      type: notification?.type,
      state: callState,
      direction:
        call?.direction ||
        call?.options?.direction ||
        notification?.direction ||
        notification?.call?.direction ||
        notification?.params?.direction ||
        notification?.data?.direction,
      inbound,
      number,
    });

    if (callState === "ringing" || callState === "new") {
      activeCallRef.current = call;
      void attachRemoteAudio(call);

      if (inbound) {
        const displayNumber = number || "שיחה נכנסת";

        setActiveBusyReason(null);
        setActiveCallNumber(displayNumber);
        setPhoneNumber(displayNumber);
        setIncomingCallNumber(displayNumber);
        setCallDirection("inbound");
        setShowDialer(false);
        setShowBusyMenu(false);
        setShowEndShiftConfirm(false);
        setShowIncomingCallModal(true);
        addRecentCall(displayNumber, "inbound");

        void changeStatus("ringing", {
          number: displayNumber,
          direction: "inbound",
          reason: null,
        });
      }
    }

    if (callState === "active" || callState === "answered") {
      activeCallRef.current = call;
      void attachRemoteAudio(call);
      setShowIncomingCallModal(false);

      void changeStatus("in_call", {
        number: number || activeCallNumber || phoneNumber,
        direction: inbound ? "inbound" : "outbound",
        reason: inbound ? null : "outbound_call",
      });
    }

    if (
      callState === "hangup" ||
      callState === "destroy" ||
      callState === "purge" ||
      callState === "done"
    ) {
      activeCallRef.current = null;
      setMuted(false);
      setSpeakerEnabled(false);
      setShowIncomingCallModal(false);
      setIncomingCallNumber("");

      void changeStatus("after_call", {
        reason: "after_call",
        number: number || activeCallNumber || phoneNumber,
        direction: inbound ? "inbound" : callDirection,
      });

      setActiveBusyReason("after_call");
      setBusyReason("after_call");
      setCallDirection("none");
      setActiveCallNumber("");
      setPhoneNumber("");
      setShowDialer(false);
      setShowBusyMenu(false);
    }
  }

  async function getWebrtcAuth() {
    const res = await fetch("/api/telnyx/webrtc-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        agentId: agent?.agentId || null,
      }),
    });

    const data = (await res.json().catch(() => null)) as WebrtcAuthResponse | null;

    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "TELNYX_WEBRTC_AUTH_FAILED");
    }

    return data;
  }

  async function connectWebrtc() {
    if (telnyxClientRef.current && webrtcReady) return telnyxClientRef.current;
    if (webrtcConnecting) return telnyxClientRef.current;

    try {
      setWebrtcConnecting(true);
      setWebrtcError("");

      const auth = await getWebrtcAuth();
      const telnyxModule = await import("@telnyx/webrtc");
      const TelnyxRTC =
        (telnyxModule as any).TelnyxRTC || (telnyxModule as any).default;

      if (!TelnyxRTC) {
        throw new Error("TELNYX_RTC_SDK_NOT_FOUND");
      }

      const clientOptions =
        auth.authType === "token" && (auth.loginToken || auth.token)
          ? { login_token: auth.loginToken || auth.token }
          : {
              login: auth.login || auth.username,
              password: auth.password,
            };

      if (!(clientOptions as any).login_token && !(clientOptions as any).login) {
        throw new Error("TELNYX_WEBRTC_LOGIN_MISSING");
      }

      const client = new TelnyxRTC(clientOptions) as TelnyxRtcClient;

      client.on?.("telnyx.ready", () => {
        console.log("TELNYX WEBRTC READY");
        setWebrtcReady(true);
        setWebrtcConnecting(false);
        setWebrtcError("");
      });

      client.on?.("telnyx.error", (...args: any[]) => {
        console.error("TELNYX WEBRTC ERROR:", args);
        setWebrtcReady(false);
        setWebrtcConnecting(false);
        setWebrtcError("שגיאת חיבור ל־WebRTC");
      });

      client.on?.("telnyx.socket.close", (...args: any[]) => {
        console.warn("TELNYX WEBRTC SOCKET CLOSED:", args);
        setWebrtcReady(false);
      });

      client.on?.("telnyx.notification", (notification: any) => {
        console.log("TELNYX NOTIFICATION EVENT RECEIVED");
        handleWebrtcNotification(notification);
      });

      telnyxClientRef.current = client;
      client.connect?.();

      return client;
    } catch (err) {
      console.error("CONNECT TELNYX WEBRTC FAILED:", err);
      setWebrtcReady(false);
      setWebrtcError("לא הצלחנו להתחבר לסופטפון בדפדפן");
      throw err;
    } finally {
      setWebrtcConnecting(false);
    }
  }

  function disconnectWebrtc() {
    try {
      activeCallRef.current?.hangup?.();
    } catch {
      // ignore hangup errors
    }

    try {
      telnyxClientRef.current?.disconnect?.();
    } catch {
      // ignore disconnect errors
    }

    activeCallRef.current = null;
    setShowIncomingCallModal(false);
    setIncomingCallNumber("");

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    telnyxClientRef.current = null;
    setWebrtcReady(false);
    setWebrtcConnecting(false);
    setWebrtcError("");
    setMuted(false);
    setSpeakerEnabled(false);
  }

  function toggleMute() {
    const call = activeCallRef.current;
    if (!call) return;

    try {
      if (muted) {
        call.unmuteAudio?.();
        setMuted(false);
      } else {
        call.muteAudio?.();
        setMuted(true);
      }
    } catch (err) {
      console.error("TOGGLE MUTE FAILED:", err);
    }
  }

  function toggleSpeaker() {
    setSpeakerEnabled((prev) => !prev);
  }

  async function attachRemoteAudio(call?: TelnyxRtcCall | null) {
    const audioElement = remoteAudioRef.current;

    if (!audioElement || !call) return;

    try {
      if (call.remoteStream instanceof MediaStream) {
        audioElement.srcObject = call.remoteStream;
      }

      audioElement.autoplay = true;
      audioElement.setAttribute("playsinline", "true");
      audioElement.muted = false;
      audioElement.volume = 1;

      await audioElement.play().catch((error) => {
        console.warn("REMOTE AUDIO PLAY WAS BLOCKED OR FAILED:", error);
      });
    } catch (error) {
      console.error("ATTACH REMOTE AUDIO FAILED:", error);
    }
  }

  function getCallMediaOptions() {
    const remoteElement = remoteAudioRef.current;

    return {
      audio: true,
      video: false,
      remoteElement: remoteElement || undefined,
    };
  }

  async function startOutboundCall() {
    if (savingStatus || creatingCall) return;

    const cleanNumber = normalizeDialNumber(phoneNumber);

    if (!cleanNumber) {
      setShowDialer(true);
      return;
    }

    ensureShiftStarted();

    try {
      setCreatingCall(true);
      setWebrtcError("");

      const client = telnyxClientRef.current || (await connectWebrtc());

      if (!client?.newCall) {
        throw new Error("TELNYX_WEBRTC_CLIENT_NOT_READY");
      }

      const auth = await getWebrtcAuth().catch(() => null);
      const callerNumber =
        auth?.callerNumber || auth?.fromNumber || TELNYX_DEFAULT_CALLER_NUMBER;

      const call = client.newCall({
        destinationNumber: cleanNumber,
        callerNumber,
        ...getCallMediaOptions(),
      });

      activeCallRef.current = call;
      void attachRemoteAudio(call);

      setActiveBusyReason("outbound_call");
      setActiveCallNumber(cleanNumber);
      setPhoneNumber(cleanNumber);
      setCallDirection("outbound");
      setShowDialer(false);
      setShowBusyMenu(false);

      addRecentCall(cleanNumber, "outbound");

      await changeStatus("dialing", {
        number: cleanNumber,
        direction: "outbound",
        reason: "outbound_call",
      });

      console.log("TELNYX WEBRTC OUTBOUND CALL STARTED:", {
        to: cleanNumber,
        callerNumber,
      });
    } catch (err) {
      console.error("START WEBRTC OUTBOUND CALL FAILED:", err);
      setWebrtcError("שגיאה בהוצאת שיחה מהדפדפן");
      alert("שגיאה בהוצאת שיחה מהדפדפן. בדקי שהסופטפון מחובר ושהמיקרופון מאושר.");
    } finally {
      setCreatingCall(false);
    }
  }

  async function rejectIncomingCall() {
    if (savingStatus) return;

    try {
      activeCallRef.current?.hangup?.();
    } catch (err) {
      console.error("REJECT WEBRTC INCOMING CALL FAILED:", err);
    }

    activeCallRef.current = null;

    setShowIncomingCallModal(false);
    setIncomingCallNumber("");
    setMuted(false);
    setSpeakerEnabled(false);

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    await changeStatus("after_call", {
      reason: "after_call",
      number: activeCallNumber || incomingCallNumber || phoneNumber,
      direction: "inbound",
    });

    setActiveBusyReason("after_call");
    setBusyReason("after_call");
    setCallDirection("none");
    setActiveCallNumber("");
    setPhoneNumber("");
    setShowDialer(false);
    setShowBusyMenu(false);
  }

  async function markAnswered() {
    if (savingStatus) return;

    const cleanNumber = activeCallNumber || normalizeDialNumber(phoneNumber);
    const call = activeCallRef.current;

    if (!cleanNumber) {
      alert("אין מספר פעיל לשיחה");
      return;
    }

    if (!call?.answer && callDirection === "inbound") {
      alert("אין שיחה נכנסת פעילה לענות לה");
      return;
    }

    ensureShiftStarted();

    try {
      if (callDirection === "inbound") {
        call?.answer?.(getCallMediaOptions());
        void attachRemoteAudio(call);
      }

      setActiveCallNumber(cleanNumber);
      setPhoneNumber(cleanNumber);
      setShowIncomingCallModal(false);
      setIncomingCallNumber("");
      setShowDialer(false);
      setShowBusyMenu(false);

      await changeStatus("in_call", {
        number: cleanNumber,
        direction: callDirection === "none" ? "outbound" : callDirection,
        reason: activeBusyReason,
      });
    } catch (err) {
      console.error("ANSWER WEBRTC CALL FAILED:", err);
      alert("שגיאה במענה לשיחה");
    }
  }

  async function finishCall() {
    if (savingStatus) return;

    ensureShiftStarted();

    try {
      activeCallRef.current?.hangup?.();
    } catch (err) {
      console.error("HANGUP WEBRTC CALL FAILED:", err);
    }

    activeCallRef.current = null;
    setShowIncomingCallModal(false);
    setIncomingCallNumber("");

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    setMuted(false);
    setSpeakerEnabled(false);

    await changeStatus("after_call", {
      reason: "after_call",
      number: activeCallNumber || phoneNumber,
      direction: callDirection,
    });

    setActiveBusyReason("after_call");
    setBusyReason("after_call");
    setCallDirection("none");
    setActiveCallNumber("");
    setPhoneNumber("");
    setShowDialer(false);
    setShowBusyMenu(false);
  }

  function appendDigit(digit: string) {
    setPhoneNumber((prev) => normalizeDialNumber(`${prev}${digit}`));
  }

  function removeLastDigit() {
    setPhoneNumber((prev) => prev.slice(0, -1));
  }

  function clearNumber() {
    setPhoneNumber("");
  }

  const currentStatus: AgentStatus = agent?.status || "offline";
  const statusStyles = getStatusStyles(currentStatus);

  const liveStatusSeconds = useMemo(() => {
    tick;
    return secondsSince(agent?.statusStartedAt);
  }, [agent?.statusStartedAt, tick]);

  const shiftSeconds = useMemo(() => {
    tick;
    return secondsSince(shiftStartedAt);
  }, [shiftStartedAt, tick]);

  const canReceiveInbound = shiftStarted && webrtcReady && currentStatus === "available";

  const isCallActive =
    currentStatus === "dialing" ||
    currentStatus === "ringing" ||
    currentStatus === "in_call";

  const activeDisplayNumber = activeCallNumber || phoneNumber || "—";
  const timerLabel = getTimerLabel(currentStatus, activeBusyReason);

  if (loading) {
    return (
      <aside
        dir="rtl"
        className="fixed bottom-4 left-4 top-4 z-[80] hidden w-[340px] lg:block"
      >
        <div className="flex h-full items-center justify-center rounded-[34px] border border-slate-800 bg-slate-950 text-white shadow-[0_28px_80px_rgba(15,23,42,0.42)]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-2xl bg-white/10" />
            <p className="text-sm font-black text-slate-300">טוען סופטפון...</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside
        dir="rtl"
        className="fixed bottom-4 left-4 top-4 z-[80] hidden w-[340px] max-w-[calc(100vw-2rem)] lg:block"
      >
        <audio ref={remoteAudioRef} autoPlay className="hidden" aria-hidden="true" />

        <div className="relative flex h-full overflow-hidden rounded-[34px] border border-white/10 bg-[#070B16] text-white shadow-[0_32px_95px_rgba(2,6,23,0.52)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(124,58,237,0.28),transparent_30%),radial-gradient(circle_at_90%_8%,rgba(16,185,129,0.17),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.07),transparent_28%)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-full bg-[radial-gradient(circle_at_50%_100%,rgba(124,58,237,0.22),transparent_55%)]" />

          <div className="relative flex min-h-0 w-full flex-col">
            <header className="shrink-0 px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-white/10 text-violet-200 ring-1 ring-white/10">
                      <Icon name="headset" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-lg font-black tracking-tight">סופטפון</p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                        זמין בכל עמוד במערכת
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black ${statusStyles.pill}`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_5px] ${statusStyles.dot}`}
                  />
                  {STATUS_LABELS[currentStatus]}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={shiftStarted ? requestEndShift : startShift}
                  disabled={!!savingStatus || creatingCall || webrtcConnecting}
                  className={`h-12 rounded-[18px] text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    shiftStarted
                      ? "border border-white/10 bg-white/8 text-white hover:bg-white/12"
                      : "bg-white text-slate-950 shadow-[0_15px_35px_rgba(255,255,255,0.16)] hover:bg-slate-100"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Icon name={shiftStarted ? "stop" : "play"} className="h-4 w-4" />
                    {shiftStarted ? "סיום משמרת" : "התחלת משמרת"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openAddCall}
                  disabled={!!savingStatus || creatingCall}
                  className="h-12 rounded-[18px] bg-gradient-to-l from-amber-400 to-[#b9945a] text-sm font-black text-slate-950 shadow-[0_16px_35px_rgba(185,148,90,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Icon name="phonePlus" className="h-4 w-4" />
                    שיחה חדשה
                  </span>
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-4">
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${statusStyles.glow}`}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-400">
                      {timerLabel}
                    </p>
                    <p
                      dir="ltr"
                      className="mt-1 font-mono text-3xl font-black tracking-tight text-white"
                    >
                      {formatDuration(liveStatusSeconds)}
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[20px] ${statusStyles.icon}`}
                  >
                    <Icon
                      name={
                        currentStatus === "in_call"
                          ? "wave"
                          : currentStatus === "ringing"
                          ? "phone"
                          : currentStatus === "available"
                          ? "check"
                          : "headset"
                      }
                      className="h-5 w-5"
                    />
                  </div>
                </div>

                <div className="relative mt-4 grid grid-cols-2 gap-2">
                  <MiniMetric
                    label="משמרת"
                    value={shiftStarted ? formatDuration(shiftSeconds) : "00:00:00"}
                  />
                  <MiniMetric
                    label="שיחות היום"
                    value={agent?.totalCallsToday ?? 0}
                  />
                </div>
              </section>

              <section className="mt-3 rounded-[28px] border border-white/10 bg-white/[0.055] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-400">
                      שיחה פעילה / יעד חיוג
                    </p>
                    <p
                      dir="ltr"
                      className="mt-1 max-w-[190px] truncate font-mono text-xl font-black tracking-wide text-white"
                    >
                      {activeDisplayNumber}
                    </p>
                  </div>

                  <div
                    className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
                      canReceiveInbound
                        ? "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/20"
                        : "bg-rose-400/12 text-rose-200 ring-1 ring-rose-400/20"
                    }`}
                  >
                    {canReceiveInbound ? "מקבל נכנסות" : "לא מקבל נכנסות"}
                  </div>
                </div>

                <div className="mt-4 flex h-12 items-center overflow-hidden rounded-[18px] border border-white/10 bg-black/20">
                  <button
                    type="button"
                    onClick={toggleDialer}
                    disabled={!!savingStatus || creatingCall || !shiftStarted}
                    className={`flex h-full w-12 shrink-0 items-center justify-center border-l border-white/10 transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      showDialer ? "bg-white text-slate-950" : "text-white hover:bg-white/10"
                    }`}
                    title="חייגן"
                  >
                    <Icon name="keypad" className="h-5 w-5" />
                  </button>

                  <input
                    ref={phoneInputRef}
                    dir="ltr"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(onlyDialChars(event.target.value))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void startOutboundCall();
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        setShowDialer(false);
                      }
                    }}
                    placeholder="הקלד מספר"
                    disabled={!shiftStarted}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-left font-mono text-sm font-black tracking-wide text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
                  />

                  <button
                    type="button"
                    onClick={startOutboundCall}
                    disabled={!!savingStatus || creatingCall || !shiftStarted}
                    className="flex h-full w-12 shrink-0 items-center justify-center border-r border-white/10 text-emerald-300 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-45"
                    title="חייג"
                  >
                    <Icon name="phone" className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={finishCall}
                    disabled={!isCallActive || !!savingStatus || creatingCall}
                    className="flex h-full w-12 shrink-0 items-center justify-center text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-35"
                    title="נתק שיחה"
                    aria-label="נתק שיחה"
                  >
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={finishCall}
                  disabled={!isCallActive || !!savingStatus || creatingCall}
                  className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isCallActive
                      ? "border-rose-400/25 bg-rose-500 text-white shadow-[0_14px_30px_rgba(244,63,94,0.18)] hover:bg-rose-400"
                      : "border-rose-400/15 bg-rose-400/8 text-rose-200"
                  }`}
                  title={isCallActive ? "נתק שיחה פעילה" : "אין שיחה פעילה לניתוק"}
                >
                  <Icon name="x" className="h-4 w-4" />
                  נתק שיחה
                </button>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={setAvailable}
                    disabled={!!savingStatus || creatingCall || !shiftStarted}
                    className={`h-11 rounded-[16px] text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      currentStatus === "available"
                        ? "bg-emerald-400 text-slate-950"
                        : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                    }`}
                  >
                    פנוי
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!shiftStarted || savingStatus) return;
                      setShowBusyMenu((prev) => !prev);
                      setShowDialer(false);
                      setShowEndShiftConfirm(false);
                    }}
                    disabled={!!savingStatus || creatingCall || !shiftStarted}
                    className="h-11 rounded-[16px] border border-rose-400/20 bg-rose-400/10 text-sm font-black text-rose-200 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    לא פנוי
                  </button>
                </div>

                {showBusyMenu && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {BUSY_REASONS.map((reason) => (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() => handleBusyReasonChange(reason.value)}
                        className={`flex h-12 items-center gap-2 rounded-[16px] px-3 text-right text-[12px] font-black transition ${
                          busyReason === reason.value
                            ? "bg-amber-400 text-slate-950"
                            : "border border-white/10 bg-white/[0.055] text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-black/15">
                          <ReasonIcon reason={reason.value} />
                        </span>
                        <span className="truncate">{reason.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {showDialer && (
                <section className="mt-3 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowDialer(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-[14px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>

                    <div className="text-right">
                      <p className="text-sm font-black text-white">חייגן מהיר</p>
                      <p className="text-[11px] font-bold text-slate-500">
                        Enter לחיוג, Esc לסגירה
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 rounded-[20px] border border-white/10 bg-black/20 px-3 py-3">
                    <p
                      dir="ltr"
                      className="truncate text-center font-mono text-2xl font-black tracking-wide text-white"
                    >
                      {phoneNumber || "—"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {DIAL_KEYS.map((digit) => (
                      <button
                        key={digit.key}
                        type="button"
                        onClick={() => appendDigit(digit.key)}
                        className="flex h-[54px] flex-col items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.06] text-white transition hover:border-amber-300/40 hover:bg-amber-300/10 active:scale-95"
                      >
                        <span className="text-xl font-black leading-5">{digit.key}</span>
                        {digit.letters && (
                          <span className="mt-0.5 text-[9px] font-black text-slate-500">
                            {digit.letters}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={removeLastDigit}
                      className="flex h-11 items-center justify-center gap-1 rounded-[16px] border border-white/10 bg-white/[0.055] text-xs font-black text-slate-300 transition hover:bg-white/10"
                    >
                      <Icon name="delete" className="h-4 w-4" />
                      מחק
                    </button>

                    <button
                      type="button"
                      onClick={clearNumber}
                      className="h-11 rounded-[16px] border border-white/10 bg-white/[0.055] text-xs font-black text-slate-300 transition hover:bg-white/10"
                    >
                      נקה
                    </button>

                    <button
                      type="button"
                      onClick={startOutboundCall}
                      disabled={creatingCall}
                      className="flex h-11 items-center justify-center gap-2 rounded-[16px] bg-emerald-400 text-xs font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <Icon name="phone" className="h-4 w-4" />
                      {creatingCall ? "מחייג..." : "חייג"}
                    </button>
                  </div>
                </section>
              )}

              <section className="mt-3 rounded-[28px] border border-white/10 bg-white/[0.055] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleDialer}
                    className="text-xs font-black text-violet-200 hover:text-white"
                  >
                    חייגן
                  </button>

                  <div>
                    <p className="text-sm font-black text-white">שיחות אחרונות</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                      לחיצה מכניסה מספר לחייגן
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {recentCalls.slice(0, 4).map((call) => (
                    <button
                      key={call.id}
                      type="button"
                      onClick={() => selectRecentCall(call)}
                      className="group flex min-h-[58px] w-full items-center gap-3 rounded-[18px] border border-white/10 bg-black/15 px-3 text-right transition hover:border-violet-300/30 hover:bg-white/10"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] ${
                          call.direction === "outbound"
                            ? "bg-sky-400/12 text-sky-200"
                            : "bg-emerald-400/12 text-emerald-200"
                        }`}
                      >
                        <Icon
                          name={call.direction === "outbound" ? "arrowOut" : "arrowIn"}
                          className="h-4 w-4"
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="text-[11px] font-black text-slate-500">
                            {call.time}
                          </span>
                          <span
                            dir="ltr"
                            className="truncate font-mono text-sm font-black text-white"
                          >
                            {call.number}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">
                          {call.label} · {formatShortDuration(call.duration)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-3 rounded-[28px] border border-white/10 bg-white/[0.055] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-black text-slate-300">
                    {webrtcReady
                      ? "WebRTC מחובר"
                      : webrtcConnecting
                      ? "WebRTC מתחבר"
                      : "WebRTC מנותק"}
                  </span>

                  <div>
                    <p className="text-sm font-black text-white">כלי שיחה</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                      פעולות מהירות בזמן טיפול
                    </p>
                  </div>
                </div>

                {webrtcError && (
                  <div className="mb-3 rounded-[16px] border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-bold leading-5 text-rose-100">
                    {webrtcError}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {quickActions.map((action) => {
                    const isActiveButton =
                      (action.type === "mute" && muted) ||
                      (action.type === "speaker" && speakerEnabled);

                    return (
                      <button
                        key={action.icon}
                        type="button"
                        title={action.title}
                        onClick={
                          action.type === "dialer"
                            ? toggleDialer
                            : action.type === "mute"
                            ? toggleMute
                            : action.type === "speaker"
                            ? toggleSpeaker
                            : undefined
                        }
                        className={`flex h-12 items-center justify-center rounded-[16px] border text-sm transition ${
                          isActiveButton
                            ? "border-white bg-white text-slate-950"
                            : "border-white/10 bg-white/[0.055] text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon name={action.icon} className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(currentStatus === "dialing" || currentStatus === "ringing") && (
                    <button
                      type="button"
                      onClick={markAnswered}
                      disabled={!!savingStatus || creatingCall}
                      className="h-12 rounded-[18px] bg-emerald-400 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      ענה
                    </button>
                  )}

                  {isCallActive && (
                    <button
                      type="button"
                      onClick={finishCall}
                      disabled={!!savingStatus || creatingCall}
                      className={`h-12 rounded-[18px] bg-rose-500 text-sm font-black text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-55 ${
                        currentStatus === "dialing" || currentStatus === "ringing"
                          ? ""
                          : "col-span-2"
                      }`}
                    >
                      סיים שיחה
                    </button>
                  )}

                  {!isCallActive && (
                    <button
                      type="button"
                      onClick={openAddCall}
                      disabled={!!savingStatus || creatingCall}
                      className="col-span-2 h-12 rounded-[18px] bg-white text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      פתח חייגן לשיחה חדשה
                    </button>
                  )}
                </div>
              </section>
            </div>

            {showEndShiftConfirm && (
              <div className="absolute inset-x-4 bottom-4 z-40 rounded-[28px] border border-white/10 bg-[#101626]/95 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <p className="text-sm font-black text-white">לסיים משמרת?</p>

                <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
                  סה״כ זמן עבודה:{" "}
                  <span dir="ltr" className="font-mono font-black text-white">
                    {formatDuration(shiftSeconds)}
                  </span>
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={confirmEndShift}
                    disabled={!!savingStatus || creatingCall}
                    className="h-11 rounded-[16px] bg-rose-500 text-sm font-black text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    כן, לסיים
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEndShiftConfirm(false)}
                    disabled={!!savingStatus || creatingCall}
                    className="h-11 rounded-[16px] border border-white/10 bg-white/[0.055] text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div
        dir="rtl"
        className="fixed bottom-4 left-4 right-4 z-[80] rounded-[28px] border border-white/10 bg-[#070B16] p-3 text-white shadow-[0_25px_80px_rgba(2,6,23,0.45)] lg:hidden"
      >
        <audio ref={remoteAudioRef} autoPlay className="hidden" aria-hidden="true" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${statusStyles.dot}`} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                סופטפון · {STATUS_LABELS[currentStatus]}
              </p>
              <p dir="ltr" className="font-mono text-xs font-black text-slate-400">
                {formatDuration(liveStatusSeconds)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={isCallActive ? finishCall : openAddCall}
            className={`h-11 rounded-[16px] px-4 text-sm font-black ${
              isCallActive ? "bg-rose-500 text-white" : "bg-emerald-400 text-slate-950"
            }`}
          >
            {isCallActive ? "סיים" : "שיחה"}
          </button>
        </div>
      </div>

      {showIncomingCallModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div
            dir="rtl"
            className="w-full max-w-[440px] overflow-hidden rounded-[34px] border border-white/10 bg-[#070B16] p-6 text-center text-white shadow-[0_35px_120px_rgba(0,0,0,0.5)]"
          >
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-[0_0_0_12px_rgba(52,211,153,0.1)]">
              <Icon name="phone" className="h-8 w-8" />
            </div>

            <p className="text-2xl font-black">שיחה נכנסת</p>

            <p className="mt-3 text-sm font-black text-slate-400">
              מתקשר/ת אליך עכשיו
            </p>

            <p
              dir="ltr"
              className="mt-2 truncate font-mono text-3xl font-black tracking-wide text-white"
            >
              {incomingCallNumber || activeCallNumber || phoneNumber || "מספר לא מזוהה"}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={rejectIncomingCall}
                disabled={!!savingStatus}
                className="h-16 rounded-[22px] border border-white/10 bg-white/[0.055] text-lg font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                דחה
              </button>

              <button
                type="button"
                onClick={markAnswered}
                disabled={!!savingStatus || creatingCall}
                className="h-16 rounded-[22px] bg-emerald-400 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ענה
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

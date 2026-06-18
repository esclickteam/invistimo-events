"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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

type SoftphoneShiftSession = {
  _id?: string;
  id?: string;
  employeeId?: string;
  businessId?: string;
  date?: string;
  month?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  totalMinutes?: number;
  status?: "open" | "closed" | string;
};

type ShiftApiResponse = {
  success?: boolean;
  alreadyOpen?: boolean;
  message?: string;
  error?: string;
  session?: SoftphoneShiftSession | null;
  summary?: {
    startedAt?: string;
    endedAt?: string;
    totalMinutes?: number;
    totalHours?: number;
  };
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
  {
    value: "manager_approval",
    label: "אישור מנהל",
    targetStatus: "unavailable",
  },
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
      dot: "bg-emerald-500 shadow-emerald-500/20",
      pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
      glow: "from-emerald-100 via-white to-transparent",
      icon: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "dialing") {
    return {
      dot: "bg-sky-500 shadow-sky-500/20",
      pill: "border-sky-200 bg-sky-50 text-sky-700",
      glow: "from-sky-100 via-white to-transparent",
      icon: "border border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (status === "ringing") {
    return {
      dot: "bg-violet-500 shadow-violet-500/20",
      pill: "border-violet-200 bg-violet-50 text-violet-700",
      glow: "from-violet-100 via-white to-transparent",
      icon: "border border-violet-200 bg-violet-50 text-violet-700",
    };
  }

  if (status === "in_call") {
    return {
      dot: "bg-rose-500 shadow-rose-500/20",
      pill: "border-rose-200 bg-rose-50 text-rose-700",
      glow: "from-rose-100 via-white to-transparent",
      icon: "border border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (
    status === "after_call" ||
    status === "break" ||
    status === "unavailable"
  ) {
    return {
      dot: "bg-amber-500 shadow-amber-500/20",
      pill: "border-amber-200 bg-amber-50 text-amber-700",
      glow: "from-amber-100 via-white to-transparent",
      icon: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    dot: "bg-slate-400 shadow-slate-400/20",
    pill: "border-slate-200 bg-slate-50 text-slate-600",
    glow: "from-slate-100 via-white to-transparent",
    icon: "border border-slate-200 bg-slate-50 text-slate-600",
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
  if (reason === "after_call")
    return <Icon name="headset" className="h-4 w-4" />;
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
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black tracking-tight text-slate-800">
        {value}
      </p>
    </div>
  );
}

function cleanUserText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getLoggedUserId(user: any) {
  return (
    cleanUserText(user?._id) ||
    cleanUserText(user?.id) ||
    cleanUserText(user?.userId) ||
    cleanUserText(user?.employeeId) ||
    cleanUserText(user?.staffId) ||
    ""
  );
}

function getLoggedUserName(user: any) {
  const firstName = cleanUserText(user?.firstName);
  const lastName = cleanUserText(user?.lastName);
  const combined = `${firstName} ${lastName}`.trim();

  return (
    cleanUserText(user?.name) ||
    cleanUserText(user?.fullName) ||
    cleanUserText(user?.displayName) ||
    cleanUserText(user?.employeeName) ||
    cleanUserText(user?.staffName) ||
    combined ||
    cleanUserText(user?.email) ||
    "עובד"
  );
}

function getLoggedUserEmail(user: any) {
  return cleanUserText(user?.email).toLowerCase();
}

function encodeSoftphoneClientState(value: Record<string, unknown>) {
  const json = JSON.stringify(value);

  if (typeof window === "undefined" || typeof window.btoa !== "function") {
    return json;
  }

  const bytes = new TextEncoder().encode(json);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

const SOFTPHONE_DIAL_EVENT = "invistimo:softphone:dial";

const SOFTPHONE_SHIFT_STORAGE_PREFIX = "invistimo:softphone:open-shift";

type PersistedSoftphoneShift = {
  shiftStarted: boolean;
  shiftStartedAt: string | null;
  shiftSessionId: string | null;
  savedAt: string;
};

function getSoftphoneShiftStorageKey(user: any) {
  const userId = getLoggedUserId(user) || getLoggedUserEmail(user) || "anonymous";
  return `${SOFTPHONE_SHIFT_STORAGE_PREFIX}:${userId}`;
}

function readPersistedSoftphoneShift(user: any): PersistedSoftphoneShift | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getSoftphoneShiftStorageKey(user));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedSoftphoneShift;

    if (!parsed?.shiftStarted || !parsed?.shiftStartedAt) {
      return null;
    }

    return {
      shiftStarted: true,
      shiftStartedAt: parsed.shiftStartedAt,
      shiftSessionId: parsed.shiftSessionId || null,
      savedAt: parsed.savedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.warn("READ PERSISTED SOFTPHONE SHIFT FAILED:", error);
    return null;
  }
}

function persistSoftphoneShift(
  user: any,
  value: {
    shiftStarted: boolean;
    shiftStartedAt?: string | null;
    shiftSessionId?: string | null;
  },
) {
  if (typeof window === "undefined") return;

  try {
    const key = getSoftphoneShiftStorageKey(user);

    if (!value.shiftStarted) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(
      key,
      JSON.stringify({
        shiftStarted: true,
        shiftStartedAt: value.shiftStartedAt || new Date().toISOString(),
        shiftSessionId: value.shiftSessionId || null,
        savedAt: new Date().toISOString(),
      } satisfies PersistedSoftphoneShift),
    );
  } catch (error) {
    console.warn("PERSIST SOFTPHONE SHIFT FAILED:", error);
  }
}

type SoftphoneDialRequest = {
  number?: string;
  phone?: string;
  label?: string;
  guestName?: string;
  taskId?: string;
  nonce?: number;
  ts?: number;
  requestId?: number;
};

type SoftphoneStatusPanelProps = {
  dialRequest?: SoftphoneDialRequest | null;
  onDialRequestConsumed?: () => void;
};

export default function SoftphoneStatusPanel({
  dialRequest = null,
  onDialRequestConsumed,
}: SoftphoneStatusPanelProps = {}) {
  const router = useRouter();
  const auth = useAuth() as any;
  const { logout } = auth;

  const loggedUser =
    auth?.user ||
    auth?.currentUser ||
    auth?.employee ||
    auth?.staff ||
    auth?.me ||
    auth?.profile ||
    null;

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
  const lastAutoDialRequestKeyRef = useRef("");

  const shiftStartedRef = useRef(false);
  const shiftStartedAtRef = useRef<string | null>(null);
  const shiftSessionIdRef = useRef<string | null>(null);

  const [tick, setTick] = useState(0);

  const [shiftStarted, setShiftStarted] = useState(false);
  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);
  const [shiftSessionId, setShiftSessionId] = useState<string | null>(null);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftError, setShiftError] = useState("");
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeCallNumber, setActiveCallNumber] = useState("");
  const [callDirection, setCallDirection] = useState<CallDirection>("none");

  const [busyReason, setBusyReason] = useState<BusyReason | "">("");
  const [activeBusyReason, setActiveBusyReason] = useState<BusyReason | null>(
    null,
  );

  const [showDialer, setShowDialer] = useState(false);
  const [showBusyMenu, setShowBusyMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recentCalls, setRecentCalls] =
    useState<RecentCall[]>(DEFAULT_RECENT_CALLS);

  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallNumber, setIncomingCallNumber] = useState("");
  const [externalDialRequest, setExternalDialRequest] =
    useState<SoftphoneDialRequest | null>(null);

  const activeDialRequest = dialRequest || externalDialRequest;

  useEffect(() => {
    shiftStartedRef.current = shiftStarted;
    shiftStartedAtRef.current = shiftStartedAt;
    shiftSessionIdRef.current = shiftSessionId;

    persistSoftphoneShift(loggedUser, {
      shiftStarted,
      shiftStartedAt,
      shiftSessionId,
    });
  }, [loggedUser, shiftStarted, shiftStartedAt, shiftSessionId]);

  useEffect(() => {
    loadMyStatus();
  }, []);

  useEffect(() => {
    function handleExternalDialRequest(event: Event) {
      const customEvent = event as CustomEvent<SoftphoneDialRequest>;
      const detail = customEvent.detail || {};
      const rawNumber = detail.number || detail.phone || "";
      const cleanNumber = normalizeDialNumber(rawNumber);

      if (!cleanNumber) return;

      const now = Date.now();

      setExternalDialRequest({
        ...detail,
        number: cleanNumber,
        phone: cleanNumber,
        nonce: detail.nonce || now,
        ts: detail.ts || now,
        requestId: detail.requestId || now,
      });
    }

    window.addEventListener(
      SOFTPHONE_DIAL_EVENT,
      handleExternalDialRequest as EventListener,
    );

    return () => {
      window.removeEventListener(
        SOFTPHONE_DIAL_EVENT,
        handleExternalDialRequest as EventListener,
      );
    };
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
    const rawNumber =
      activeDialRequest?.number || activeDialRequest?.phone || "";
    const cleanNumber = normalizeDialNumber(rawNumber);

    if (!cleanNumber) return;

    const requestKey = [
      activeDialRequest?.nonce,
      activeDialRequest?.ts,
      activeDialRequest?.requestId,
      activeDialRequest?.taskId,
      cleanNumber,
    ]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .join(":");

    if (!requestKey || lastAutoDialRequestKeyRef.current === requestKey) return;

    lastAutoDialRequestKeyRef.current = requestKey;

    setPhoneNumber(cleanNumber);
    setActiveBusyReason("outbound_call");
    setBusyReason("");
    setCallDirection("outbound");
    setActiveCallNumber(cleanNumber);
    setShowEndShiftConfirm(false);
    setShowBusyMenu(false);
    setShowHistory(false);
    setShowIncomingCallModal(false);
    setIncomingCallNumber("");
    setShowDialer(true);

    const timer = window.setTimeout(() => {
      void startOutboundCall(cleanNumber);
      if (externalDialRequest) {
        setExternalDialRequest(null);
      } else {
        onDialRequestConsumed?.();
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeDialRequest?.nonce,
    activeDialRequest?.ts,
    activeDialRequest?.requestId,
    activeDialRequest?.taskId,
    activeDialRequest?.number,
    activeDialRequest?.phone,
  ]);

  function getShiftSessionId(session?: SoftphoneShiftSession | null) {
    return String(session?._id || session?.id || "");
  }

  async function startShiftSessionApi() {
    setShiftSaving(true);
    setShiftError("");

    try {
      const response = await fetch("/api/softphone/shift/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          source: "softphone",
          meta: {
            webrtcReady,
          },
        }),
      });

      const data = (await response
        .json()
        .catch(() => null)) as ShiftApiResponse | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || "SHIFT_START_FAILED");
      }

      return data.session || null;
    } finally {
      setShiftSaving(false);
    }
  }

  async function endShiftSessionApi() {
    setShiftSaving(true);
    setShiftError("");

    try {
      const response = await fetch("/api/softphone/shift/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          source: "softphone",
          meta: {
            shiftSessionId,
            webrtcReady,
          },
        }),
      });

      const data = (await response
        .json()
        .catch(() => null)) as ShiftApiResponse | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || "SHIFT_END_FAILED");
      }

      return data.session || null;
    } finally {
      setShiftSaving(false);
    }
  }

  async function loadMyStatus() {
    const now = new Date().toISOString();
    const persistedShift = readPersistedSoftphoneShift(loggedUser);

    setLoading(true);
    setShiftError("");

    const defaultStatus: AgentStatus = persistedShift?.shiftStarted
      ? "available"
      : "offline";

    setAgent({
      agentId: getLoggedUserId(loggedUser) || "local-softphone",
      name: getLoggedUserName(loggedUser),
      email: getLoggedUserEmail(loggedUser),
      status: defaultStatus,
      statusStartedAt: persistedShift?.shiftStartedAt || now,
      todayAvailableSeconds: 0,
      todayDialingSeconds: 0,
      todayRingingSeconds: 0,
      todayTalkSeconds: 0,
      todayAfterCallSeconds: 0,
      todayBreakSeconds: 0,
      todayUnavailableSeconds: 0,
      todayOfflineSeconds: 0,
      totalCallsToday: 0,
      answeredCallsToday: 0,
      missedCallsToday: 0,
      failedCallsToday: 0,
      lastSeenAt: now,
    });

    if (persistedShift?.shiftStarted) {
      setShiftStarted(true);
      setShiftStartedAt(persistedShift.shiftStartedAt || now);
      setShiftSessionId(persistedShift.shiftSessionId || null);

      // חשוב: מעבר עמוד / רענון לא מסיים משמרת.
      // רק מחזירים את העובד לסטטוס זמין ומעדכנים נוכחות חיה.
      void syncLiveStatus("available", {
        direction: "none",
        number: null,
        reason: null,
        shiftStartedOverride: true,
        shiftStartedAtOverride: persistedShift.shiftStartedAt || now,
        shiftSessionIdOverride: persistedShift.shiftSessionId || null,
      });
    } else {
      setShiftStarted(false);
      setShiftStartedAt(null);
      setShiftSessionId(null);
    }

    setLoading(false);
  }

  function ensureShiftStarted() {
    if (shiftStartedRef.current) return;

    const now = new Date().toISOString();

    shiftStartedRef.current = true;
    shiftStartedAtRef.current = now;

    setShiftStarted(true);
    setShiftStartedAt(now);

    persistSoftphoneShift(loggedUser, {
      shiftStarted: true,
      shiftStartedAt: now,
      shiftSessionId: shiftSessionIdRef.current,
    });
  }

  async function ensureShiftStartedForCall() {
    if (shiftStartedRef.current) return;

    try {
      const session = await startShiftSessionApi();
      const startedAt = session?.startedAt || new Date().toISOString();
      const sessionId = getShiftSessionId(session);

      shiftStartedRef.current = true;
      shiftStartedAtRef.current = startedAt;
      shiftSessionIdRef.current = sessionId;

      setShiftStarted(true);
      setShiftStartedAt(startedAt);
      setShiftSessionId(sessionId);
      setShiftError("");

      persistSoftphoneShift(loggedUser, {
        shiftStarted: true,
        shiftStartedAt: startedAt,
        shiftSessionId: sessionId,
      });
    } catch (error) {
      console.error("AUTO START SHIFT FOR CALL FAILED:", error);

      const startedAt = new Date().toISOString();

      shiftStartedRef.current = true;
      shiftStartedAtRef.current = startedAt;

      setShiftStarted(true);
      setShiftStartedAt(startedAt);

      persistSoftphoneShift(loggedUser, {
        shiftStarted: true,
        shiftStartedAt: startedAt,
        shiftSessionId: shiftSessionIdRef.current,
      });
    }
  }

  async function syncLiveStatus(
    nextStatus: AgentStatus,
    options?: {
      reason?: BusyReason | null;
      number?: string | null;
      direction?: CallDirection;
      shiftStartedOverride?: boolean;
      shiftStartedAtOverride?: string | null;
      shiftSessionIdOverride?: string | null;
      endedBy?: "employee" | "admin" | null;
    },
  ) {
    const number = options?.number || activeCallNumber || phoneNumber || "";
    const direction = options?.direction || callDirection || "none";

    try {
      await fetch("/api/softphone/live-status", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          status: nextStatus,
          reason: options?.reason || null,
          reasonLabel: getBusyReasonLabel(options?.reason || null),

          number,
          phone: number,
          direction,

          shiftSessionId:
            options?.shiftSessionIdOverride !== undefined
              ? options.shiftSessionIdOverride
              : shiftSessionIdRef.current,
          shiftStarted:
            options?.shiftStartedOverride !== undefined
              ? options.shiftStartedOverride
              : shiftStartedRef.current,
          shiftStartedAt:
            options?.shiftStartedAtOverride !== undefined
              ? options.shiftStartedAtOverride
              : shiftStartedAtRef.current,

          endedBy: options?.endedBy || null,

          statusStartedAt: new Date().toISOString(),

          taskId: activeDialRequest?.taskId || "",
          guestName: activeDialRequest?.guestName || activeDialRequest?.label || "",
          label: activeDialRequest?.label || "",

          webrtcReady,
          source: "staff-softphone",
        }),
      });
    } catch (error) {
      console.error("SOFTPHONE LIVE STATUS SYNC FAILED:", error);
    }
  }

  async function changeStatus(
    nextStatus: AgentStatus,
    options?: {
      reason?: BusyReason | null;
      number?: string | null;
      direction?: CallDirection;
      autoStartShift?: boolean;
      endShiftExplicitly?: boolean;
      endedBy?: "employee" | "admin" | null;
    },
  ) {
    if (savingStatus) return;

    const now = new Date().toISOString();
    const shouldAutoStartShift = options?.autoStartShift !== false;
    const explicitShiftEnd =
      nextStatus === "offline" && options?.endShiftExplicitly === true;

    // קריטי:
    // offline רגיל לא מסיים משמרת. רק confirmEndShift / הוצאה ע״י אדמין.
    if (nextStatus !== "offline" && shouldAutoStartShift) {
      ensureShiftStarted();
    }

    setSavingStatus(nextStatus);

    const currentNumber = options?.number || activeCallNumber || phoneNumber || "";
    const currentDirection = options?.direction || callDirection || "none";

    setAgent((prev) => ({
      agentId:
        prev?.agentId ||
        getLoggedUserId(loggedUser) ||
        "local-softphone",
      name: prev?.name || getLoggedUserName(loggedUser),
      email: prev?.email || getLoggedUserEmail(loggedUser),
      status: nextStatus,
      statusStartedAt: now,
      currentCallId: prev?.currentCallId || null,
      todayAvailableSeconds: prev?.todayAvailableSeconds || 0,
      todayDialingSeconds: prev?.todayDialingSeconds || 0,
      todayRingingSeconds: prev?.todayRingingSeconds || 0,
      todayTalkSeconds: prev?.todayTalkSeconds || 0,
      todayAfterCallSeconds: prev?.todayAfterCallSeconds || 0,
      todayBreakSeconds: prev?.todayBreakSeconds || 0,
      todayUnavailableSeconds: prev?.todayUnavailableSeconds || 0,
      todayOfflineSeconds: prev?.todayOfflineSeconds || 0,
      totalCallsToday:
        nextStatus === "dialing" && prev?.status !== "dialing"
          ? (prev?.totalCallsToday || 0) + 1
          : prev?.totalCallsToday || 0,
      answeredCallsToday:
        nextStatus === "in_call" && prev?.status !== "in_call"
          ? (prev?.answeredCallsToday || 0) + 1
          : prev?.answeredCallsToday || 0,
      missedCallsToday: prev?.missedCallsToday || 0,
      failedCallsToday: prev?.failedCallsToday || 0,
      lastSeenAt: now,
    }));

    await syncLiveStatus(nextStatus, {
      ...options,
      number: currentNumber,
      direction: currentDirection,
      endedBy: explicitShiftEnd ? options?.endedBy || "employee" : null,
    });

    if (explicitShiftEnd) {
      persistSoftphoneShift(loggedUser, { shiftStarted: false });
    }

    window.setTimeout(() => {
      setSavingStatus(null);
    }, 80);
  }

  async function startShift() {
    if (savingStatus || webrtcConnecting || shiftSaving) return;

    try {
      setShiftError("");

      await connectWebrtc();

      const session = await startShiftSessionApi();
      const startedAt = session?.startedAt || new Date().toISOString();

      const sessionId = getShiftSessionId(session);

      shiftStartedRef.current = true;
      shiftStartedAtRef.current = startedAt;
      shiftSessionIdRef.current = sessionId;

      setShiftStarted(true);
      setShiftStartedAt(startedAt);
      setShiftSessionId(sessionId);

      persistSoftphoneShift(loggedUser, {
        shiftStarted: true,
        shiftStartedAt: startedAt,
        shiftSessionId: sessionId,
      });
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
    } catch (error) {
      console.error("START SHIFT FAILED:", error);
      const message =
        error instanceof Error ? error.message : "לא הצלחנו להתחיל משמרת";
      setShiftError(message);
      alert("לא הצלחנו להתחיל משמרת. בדקי חיבור סופטפון והרשאת מיקרופון.");
    }
  }

  function requestEndShift() {
    if (!shiftStarted || savingStatus) return;
    setShowEndShiftConfirm(true);
    setShowDialer(false);
    setShowBusyMenu(false);
  }

  async function confirmEndShift() {
    if (savingStatus || shiftSaving) return;

    try {
      setShiftError("");

      await endShiftSessionApi();

      disconnectWebrtc();

      shiftStartedRef.current = false;
      shiftStartedAtRef.current = null;
      shiftSessionIdRef.current = null;

      persistSoftphoneShift(loggedUser, { shiftStarted: false });

      setShowEndShiftConfirm(false);
      setShiftStarted(false);
      setShiftStartedAt(null);
      setShiftSessionId(null);
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
        endShiftExplicitly: true,
        endedBy: "employee",
      });
    } catch (error) {
      console.error("END SHIFT FAILED:", error);
      const message =
        error instanceof Error ? error.message : "לא הצלחנו לסיים משמרת";
      setShiftError(message);
      alert("לא הצלחנו לשמור סיום משמרת. נסי שוב.");
    }
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
    setShowHistory(false);
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
    setShowHistory(false);
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
    setShowHistory(false);
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
    setShowHistory(false);
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

  function isInboundWebrtcCall(
    call?: TelnyxRtcCall | null,
    notification?: any,
  ) {
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
        "",
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

    const data = (await res
      .json()
      .catch(() => null)) as WebrtcAuthResponse | null;

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

      if (
        !(clientOptions as any).login_token &&
        !(clientOptions as any).login
      ) {
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

  async function startOutboundCall(explicitNumber?: string) {
    if (savingStatus || creatingCall) return;

    const cleanNumber = normalizeDialNumber(explicitNumber || phoneNumber);

    if (!cleanNumber) {
      setShowDialer(true);
      return;
    }

    try {
      setCreatingCall(true);
      await ensureShiftStartedForCall();
      setWebrtcError("");

      const client = telnyxClientRef.current || (await connectWebrtc());

      if (!client?.newCall) {
        throw new Error("TELNYX_WEBRTC_CLIENT_NOT_READY");
      }

      const auth = await getWebrtcAuth().catch(() => null);
      const callerNumber =
        auth?.callerNumber || auth?.fromNumber || TELNYX_DEFAULT_CALLER_NUMBER;

      const agentId =
        getLoggedUserId(loggedUser) || agent?.agentId || "local-softphone";
      const agentName =
        getLoggedUserName(loggedUser) || agent?.name || agent?.email || "עובד";
      const agentEmail = getLoggedUserEmail(loggedUser) || agent?.email || "";

      const clientState = encodeSoftphoneClientState({
        source: "invistimo-softphone-webrtc",
        requestedAt: new Date().toISOString(),

        agentId,
        agentName,
        agentEmail,

        customerPhone: cleanNumber,
        dialedPhone: cleanNumber,
        destinationPhone: cleanNumber,

        normalizedTo: cleanNumber,
        normalizedFrom: callerNumber,

        taskId: activeDialRequest?.taskId || "",
        guestName:
          activeDialRequest?.guestName || activeDialRequest?.label || "",
        label: activeDialRequest?.label || "",
        requestId: activeDialRequest?.requestId || "",
        nonce: activeDialRequest?.nonce || "",
        ts: activeDialRequest?.ts || "",
      });

      const call = client.newCall({
        destinationNumber: cleanNumber,
        callerNumber,
        clientState,
        client_state: clientState,
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
        agentId,
        agentName,
        agentEmail,
      });
    } catch (err) {
      console.error("START WEBRTC OUTBOUND CALL FAILED:", err);
      setWebrtcError("שגיאה בהוצאת שיחה מהדפדפן");
      alert(
        "שגיאה בהוצאת שיחה מהדפדפן. בדקי שהסופטפון מחובר ושהמיקרופון מאושר.",
      );
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

  const canReceiveInbound =
    shiftStarted && webrtcReady && currentStatus === "available";

  const isCallActive =
    currentStatus === "dialing" ||
    currentStatus === "ringing" ||
    currentStatus === "in_call";

  const activeDisplayNumber = activeCallNumber || phoneNumber || "—";
  const timerLabel = getTimerLabel(currentStatus, activeBusyReason);

  async function handleLogout() {
    try {
      /*
        חשוב: התנתקות לא מסיימת משמרת.
        סיום משמרת נשמר רק דרך כפתור "סיים משמרת" ואישור ידני.
      */
      disconnectWebrtc();

      await logout();
    } catch (error) {
      console.error("STAFF SOFTPHONE LOGOUT FAILED:", error);
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="sticky top-0 z-[80] w-full border-b border-slate-200 bg-white/95 px-3 py-2 text-slate-900 shadow-sm backdrop-blur print:hidden"
      >
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
            <div>
              <p className="text-sm font-black text-slate-900">
                טוען סופטפון...
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                מכין סטטוס עובד ושיחות
              </p>
            </div>
          </div>

          <div className="hidden h-9 w-[260px] animate-pulse rounded-2xl bg-slate-100 md:block" />
        </div>
      </div>
    );
  }

  return (
    <>
      <header
        dir="rtl"
        className="sticky top-0 z-[80] w-full border-b border-slate-200 bg-white/95 px-3 py-2 text-slate-900 shadow-sm backdrop-blur print:hidden"
      >
        <audio
          ref={remoteAudioRef}
          autoPlay
          className="hidden"
          aria-hidden="true"
        />

        <div className="mx-auto w-full max-w-[1800px]">
          <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_10%_20%,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(16,185,129,0.08),transparent_22%)]" />

            <div className="relative flex min-h-[58px] flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${statusStyles.icon}`}
                >
                  <Icon name="headset" className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black tracking-tight text-slate-900">
                      סופטפון עובדים
                    </h2>

                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black ${statusStyles.pill}`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px] ${statusStyles.dot}`}
                      />
                      {STATUS_LABELS[currentStatus]}
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${
                        webrtcReady
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-700"
                          : webrtcConnecting
                            ? "border-sky-400/20 bg-sky-400/10 text-sky-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {webrtcReady
                        ? "WebRTC מחובר"
                        : webrtcConnecting
                          ? "מתחבר..."
                          : "WebRTC מנותק"}
                    </span>

                    {canReceiveInbound && (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                        מוכן לקבל שיחות
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
                    {timerLabel}:{" "}
                    <span
                      dir="ltr"
                      className="font-mono font-black text-slate-900"
                    >
                      {formatDuration(liveStatusSeconds)}
                    </span>
                    {" · "}משמרת:{" "}
                    <span
                      dir="ltr"
                      className="font-mono font-black text-slate-900"
                    >
                      {formatDuration(shiftSeconds)}
                    </span>
                    {webrtcError ? ` · ${webrtcError}` : ""}
                    {shiftError ? ` · ${shiftError}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2 xl:justify-center">
                <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600">
                  שיחות היום:{" "}
                  <span className="font-mono text-slate-900">
                    {agent?.totalCallsToday || 0}
                  </span>
                </span>
                <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600">
                  נענו:{" "}
                  <span className="font-mono text-slate-900">
                    {agent?.answeredCallsToday || 0}
                  </span>
                </span>
                <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600">
                  לא נענו:{" "}
                  <span className="font-mono text-slate-900">
                    {agent?.missedCallsToday || 0}
                  </span>
                </span>
                <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600">
                  זמן שיחה:{" "}
                  <span dir="ltr" className="font-mono text-slate-900">
                    {formatDuration(agent?.todayTalkSeconds || 0)}
                  </span>
                </span>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={shiftStarted ? requestEndShift : startShift}
                  disabled={
                    !!savingStatus ||
                    creatingCall ||
                    webrtcConnecting ||
                    shiftSaving
                  }
                  className={`h-10 rounded-2xl px-4 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    shiftStarted
                      ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {shiftStarted
                    ? "סיים משמרת"
                    : webrtcConnecting || shiftSaving
                      ? "מתחבר..."
                      : "התחל משמרת"}
                </button>

                <button
                  type="button"
                  onClick={openAddCall}
                  disabled={!!savingStatus || creatingCall || shiftSaving}
                  className="h-10 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-xs font-black text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  שיחה חדשה
                </button>

                <button
                  type="button"
                  onClick={setAvailable}
                  disabled={!!savingStatus || creatingCall || !shiftStarted}
                  className="h-10 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 text-xs font-black text-emerald-700 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  פנוי
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (!shiftStarted) return;
                      setShowBusyMenu((prev) => !prev);
                      setShowHistory(false);
                      setShowDialer(false);
                    }}
                    disabled={
                      !shiftStarted ||
                      !!savingStatus ||
                      creatingCall ||
                      shiftSaving
                    }
                    className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    לא פנוי
                  </button>

                  {showBusyMenu && (
                    <div className="absolute left-0 top-12 z-[100] w-[260px] rounded-[24px] border border-slate-200 bg-white p-2 shadow-xl">
                      {BUSY_REASONS.map((reason) => (
                        <button
                          key={reason.value}
                          type="button"
                          onClick={() =>
                            void handleBusyReasonChange(reason.value)
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-3 text-right text-sm font-black text-slate-700 transition hover:bg-slate-100"
                        >
                          <span>{reason.label}</span>
                          <span className="text-slate-500">
                            <ReasonIcon reason={reason.value} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>


                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHistory((prev) => !prev);
                      setShowBusyMenu(false);
                      setShowDialer(false);
                    }}
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    היסטוריה
                  </button>

                  {showHistory && (
                    <div className="absolute left-0 top-12 z-[100] w-[340px] rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-900">היסטוריית שיחות</p>
                        <button
                          type="button"
                          onClick={() => setShowHistory(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                          aria-label="סגור היסטוריה"
                        >
                          <Icon name="x" className="h-4 w-4" />
                        </button>
                      </div>

                      {recentCalls.length ? (
                        <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                          {recentCalls.map((call) => (
                            <button
                              key={call.id}
                              type="button"
                              onClick={() => selectRecentCall(call)}
                              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-right transition hover:border-sky-200 hover:bg-sky-50"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200">
                                  <Icon
                                    name={call.direction === "inbound" ? "arrowIn" : "arrowOut"}
                                    className="h-4 w-4"
                                  />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-black text-slate-900">
                                    {call.label || (call.direction === "inbound" ? "נכנסת" : "יוצאת")}
                                  </span>
                                  <span dir="ltr" className="block truncate text-left font-mono text-sm font-black text-slate-700">
                                    {call.number}
                                  </span>
                                </span>
                              </span>
                              <span className="shrink-0 text-xs font-black text-slate-500">
                                {call.time}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-500">
                          אין שיחות אחרונות להצגה
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-10 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                >
                  התנתקות
                </button>

                {(showDialer || isCallActive) && (
                  <div className="order-last flex h-12 w-[430px] max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm xl:ml-1 max-2xl:w-[390px] max-xl:w-full">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                        isCallActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      <Icon name="phone" className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-black text-slate-500">
                        {isCallActive ? "שיחה פעילה" : "חייגן"}
                        {" · "}
                        <span dir="ltr" className="font-mono text-slate-800">
                          {formatDuration(liveStatusSeconds)}
                        </span>
                      </p>

                      {isCallActive ? (
                        <p
                          dir="ltr"
                          className="truncate text-left font-mono text-sm font-black tracking-wide text-slate-900"
                        >
                          {activeDisplayNumber}
                        </p>
                      ) : (
                        <input
                          ref={phoneInputRef}
                          dir="ltr"
                          value={phoneNumber}
                          onChange={(event) =>
                            setPhoneNumber(onlyDialChars(event.target.value))
                          }
                          disabled={creatingCall}
                          placeholder="הקלד מספר"
                          className="mt-0.5 h-7 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-left font-mono text-sm font-black text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 disabled:opacity-60"
                        />
                      )}
                    </div>

                    {isCallActive ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={markAnswered}
                          disabled={!isCallActive || !!savingStatus || creatingCall}
                          className="h-9 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          ענה
                        </button>

                        <button
                          type="button"
                          onClick={toggleMute}
                          disabled={!isCallActive}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-45 ${
                            muted
                              ? "border-amber-400/20 bg-amber-400/15 text-amber-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                          aria-label={muted ? "בטל השתק" : "השתק"}
                        >
                          <Icon name="mic" className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={toggleSpeaker}
                          disabled={!isCallActive}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-45 ${
                            speakerEnabled
                              ? "border-sky-400/20 bg-sky-400/15 text-sky-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                          aria-label="רמקול"
                        >
                          <Icon name="speaker" className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={finishCall}
                          disabled={!isCallActive || !!savingStatus || creatingCall}
                          className="h-9 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          סיים
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void startOutboundCall()}
                          disabled={!shiftStarted || creatingCall || !phoneNumber.trim()}
                          className="h-9 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {creatingCall ? "מחייג" : "חייג"}
                        </button>

                        <button
                          type="button"
                          onClick={clearNumber}
                          disabled={creatingCall || !phoneNumber}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="נקה מספר"
                        >
                          <Icon name="delete" className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDialer(false)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100"
                          aria-label="סגור חייגן"
                        >
                          <Icon name="x" className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {showEndShiftConfirm && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-500/25 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-[420px] rounded-[30px] border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <p className="text-xl font-black">לסיים משמרת?</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              סה״כ זמן עבודה:{" "}
              <span dir="ltr" className="font-mono font-black text-slate-900">
                {formatDuration(shiftSeconds)}
              </span>
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={confirmEndShift}
                disabled={!!savingStatus || creatingCall || shiftSaving}
                className="h-12 rounded-2xl border border-rose-200 bg-rose-50 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                כן, לסיים
              </button>

              <button
                type="button"
                onClick={() => setShowEndShiftConfirm(false)}
                disabled={!!savingStatus || creatingCall || shiftSaving}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {showIncomingCallModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-500/25 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-[440px] rounded-[34px] border border-slate-200 bg-white p-6 text-center text-slate-900 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[26px] bg-emerald-400 text-slate-950">
              <Icon name="phone" className="h-7 w-7" />
            </div>

            <p className="mt-5 text-sm font-black text-emerald-700">
              שיחה נכנסת
            </p>
            <p dir="ltr" className="mt-2 font-mono text-3xl font-black">
              {incomingCallNumber ||
                activeCallNumber ||
                phoneNumber ||
                "מספר לא מזוהה"}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={rejectIncomingCall}
                disabled={!!savingStatus}
                className="h-14 rounded-2xl border border-slate-200 bg-slate-50 text-base font-black text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                דחה
              </button>

              <button
                type="button"
                onClick={markAnswered}
                disabled={!!savingStatus || creatingCall || shiftSaving}
                className="h-14 rounded-2xl border border-emerald-200 bg-emerald-50 text-base font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
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

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

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name:
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
    | "shield";
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

  if (name === "keypad") {
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

  return (
    <svg {...common}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ReasonIcon({ reason }: { reason: BusyReason }) {
  if (reason === "break") return <Icon name="coffee" className="h-4 w-4" />;
  if (reason === "back_office") return <Icon name="briefcase" className="h-4 w-4" />;
  if (reason === "manager_approval") return <Icon name="shield" className="h-4 w-4" />;
  if (reason === "after_call") return <Icon name="headset" className="h-4 w-4" />;
  return <Icon name="minus" className="h-4 w-4" />;
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

      if (isTypingInPhoneInput) {
        return;
      }

      if (isTypingInOtherInput) {
        return;
      }

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

      if (data.agent?.status && data.agent.status !== "offline") {
        setShiftStarted(true);
        setShiftStartedAt(data.agent.statusStartedAt || new Date().toISOString());
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

      setAgent((prev) => ({
        ...(prev || {}),
        ...data.agent,
      }));
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

    await changeStatus(selected.targetStatus, {
      reason: value,
      direction: "none",
      number: null,
    });
  }

  function openAddCall() {
    if (!shiftStarted) {
      startShift();
      return;
    }

    setActiveBusyReason("outbound_call");
    setBusyReason("");
    setCallDirection("outbound");
    setShowEndShiftConfirm(false);
    setShowBusyMenu(false);
    setShowDialer(true);
  }

  function toggleDialer() {
    if (!shiftStarted) return;

    setActiveBusyReason("outbound_call");
    setCallDirection("outbound");
    setShowEndShiftConfirm(false);
    setShowBusyMenu(false);
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
    const direction =
      String(call?.direction || "") ||
      String(call?.options?.direction || "") ||
      String(notification?.direction || "") ||
      String(notification?.call?.direction || "");

    return direction.toLowerCase().includes("inbound");
  }

  function handleWebrtcNotification(notification: any) {
    const call = (notification?.call || notification) as TelnyxRtcCall | null;
    const callState = String(call?.state || notification?.state || "");

    if (!call) return;

    const inbound = isInboundWebrtcCall(call, notification);
    const number = getCallNumber(call, activeCallNumber || phoneNumber || "");

    console.log("TELNYX WEBRTC NOTIFICATION:", {
      type: notification?.type,
      state: callState,
      direction: call?.direction || call?.options?.direction,
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
        setCallDirection("inbound");
        setShowDialer(false);
        setShowBusyMenu(false);
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

  async function simulateIncomingCall() {
    if (savingStatus) return;

    const cleanNumber = normalizeDialNumber(phoneNumber);

    if (!cleanNumber) {
      setShowDialer(true);
      return;
    }

    ensureShiftStarted();

    setActiveBusyReason(null);
    setActiveCallNumber(cleanNumber);
    setPhoneNumber(cleanNumber);
    setCallDirection("inbound");
    setShowDialer(false);
    setShowBusyMenu(false);

    addRecentCall(cleanNumber, "inbound");

    await changeStatus("ringing", {
      number: cleanNumber,
      direction: "inbound",
      reason: null,
    });
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
      <section dir="rtl" className="w-full">
        <div className="flex h-[68px] w-full items-center rounded-[24px] border border-slate-200 bg-white px-4 shadow-sm">
          <p className="text-sm font-bold text-slate-600">טוען סופטפון...</p>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" className="relative w-full max-w-full">
      <audio
        ref={remoteAudioRef}
        autoPlay
        className="hidden"
        aria-hidden="true"
      />

      <div
        dir="ltr"
        className="relative flex h-[72px] w-full max-w-full items-center gap-2 overflow-visible rounded-[26px] border border-slate-200 bg-white px-3 shadow-[0_18px_55px_rgba(15,23,42,0.12)]"
      >
        <button
          type="button"
          onClick={shiftStarted ? requestEndShift : startShift}
          disabled={!!savingStatus || creatingCall || webrtcConnecting}
          dir="rtl"
          className={`flex h-12 w-[150px] items-center justify-center gap-2 rounded-2xl text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
            shiftStarted
              ? "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              : "bg-[#111827] text-white shadow-[0_12px_28px_rgba(17,24,39,0.22)] hover:bg-black"
          }`}
        >
          <Icon name={shiftStarted ? "stop" : "play"} className="h-4 w-4" />
          {shiftStarted ? "סיום משמרת" : "התחלת משמרת"}
        </button>

        <div
          dir="rtl"
          className="flex h-12 w-[128px] items-center justify-center gap-2 rounded-2xl"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.13)]" />
          <div className="leading-4">
            <p className="text-[11px] font-black text-slate-500">משמרת פעילה</p>
            <p dir="ltr" className="font-mono text-sm font-black text-slate-950">
              {shiftStarted ? formatDuration(shiftSeconds) : "00:00:00"}
            </p>
          </div>
        </div>

        <div
          dir="rtl"
          className={`hidden h-12 w-[132px] items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black xl:flex ${
            webrtcReady
              ? "bg-emerald-50 text-emerald-700"
              : webrtcConnecting
              ? "bg-blue-50 text-blue-700"
              : "bg-red-50 text-red-700"
          }`}
          title={webrtcError || undefined}
        >
          <Icon name="headset" className="h-4 w-4" />
          {webrtcReady ? "WebRTC מחובר" : webrtcConnecting ? "מתחבר..." : "WebRTC מנותק"}
        </div>

        <span className="hidden text-lg text-slate-300 xl:block">←</span>

        <button
          type="button"
          onClick={requestEndShift}
          disabled={!!savingStatus || creatingCall || !shiftStarted}
          dir="rtl"
          className="hidden h-12 w-[132px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 xl:flex"
        >
          סיום משמרת
          <Icon name="stop" className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={setAvailable}
          disabled={!!savingStatus || creatingCall || !shiftStarted}
          dir="rtl"
          className={`flex h-12 w-[92px] items-center justify-center gap-2 rounded-2xl text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
            currentStatus === "available"
              ? "bg-emerald-600 text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)]"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          פנוי
          <Icon name="check" className="h-4 w-4" />
        </button>

        <div className="relative" dir="rtl">
          <button
            type="button"
            onClick={() => {
              if (!shiftStarted || savingStatus) return;
              setShowBusyMenu((prev) => !prev);
              setShowDialer(false);
              setShowEndShiftConfirm(false);
            }}
            disabled={!!savingStatus || creatingCall || !shiftStarted}
            className="flex h-12 w-[110px] items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            לא פנוי
            <Icon name="minus" className="h-4 w-4" />
          </button>

          {showBusyMenu && (
            <div className="absolute right-0 top-[58px] z-50 w-[245px] overflow-hidden rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
              {BUSY_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() => handleBusyReasonChange(reason.value)}
                  className={`flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-right text-sm font-black transition hover:bg-slate-50 ${
                    busyReason === reason.value
                      ? "bg-red-50 text-red-700"
                      : "text-slate-700"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <ReasonIcon reason={reason.value} />
                  </span>
                  {reason.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          dir="rtl"
          className={`flex h-12 w-[178px] items-center gap-3 rounded-2xl border px-3 ${
            currentStatus === "available"
              ? "border-emerald-200 bg-emerald-50"
              : currentStatus === "dialing"
              ? "border-blue-200 bg-blue-50"
              : currentStatus === "in_call"
              ? "border-red-200 bg-red-50"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_5px] ${
              currentStatus === "available"
                ? "bg-emerald-500 shadow-emerald-100"
                : currentStatus === "dialing"
                ? "bg-blue-500 shadow-blue-100"
                : currentStatus === "in_call"
                ? "bg-red-500 shadow-red-100"
                : "bg-orange-500 shadow-orange-100"
            }`}
          />
          <div className="min-w-0 leading-4">
            <p className="truncate text-[11px] font-black text-slate-600">
              {timerLabel}
            </p>
            <p dir="ltr" className="font-mono text-sm font-black text-slate-950">
              {formatDuration(liveStatusSeconds)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddCall}
          disabled={!!savingStatus || creatingCall}
          dir="rtl"
          className="flex h-12 w-[124px] items-center justify-center gap-2 rounded-2xl bg-[#b9945a] text-sm font-black text-white shadow-[0_10px_24px_rgba(185,148,90,0.25)] transition hover:bg-[#9f7a3f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          הוספת שיחה
          <Icon name="phonePlus" className="h-4 w-4" />
        </button>

        <div
          dir="rtl"
          className={`hidden h-12 w-[122px] items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black 2xl:flex ${
            canReceiveInbound
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          <Icon name="phone" className="h-4 w-4" />
          {canReceiveInbound ? "מקבל נכנסות" : "לא מקבל נכנסות"}
        </div>

        <div
          dir="rtl"
          className="relative flex h-12 min-w-[220px] flex-1 items-center rounded-2xl border border-slate-200 bg-white"
        >
          <button
            type="button"
            onClick={toggleDialer}
            disabled={!!savingStatus || creatingCall || !shiftStarted}
            className={`flex h-full w-[92px] items-center justify-center gap-2 rounded-r-2xl border-l border-slate-200 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
              showDialer
                ? "bg-slate-950 text-white"
                : "bg-slate-50 text-slate-950 hover:bg-slate-100"
            }`}
          >
            <Icon name="keypad" className="h-4 w-4" />
            מקשים
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
            placeholder="מספר נוכחי / יעד חיוג"
            disabled={!shiftStarted}
            className="h-full min-w-0 flex-1 bg-white px-3 text-left font-mono text-sm font-black tracking-wide text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
          />

          <button
            type="button"
            onClick={startOutboundCall}
            disabled={!!savingStatus || creatingCall || !shiftStarted}
            className="flex h-full w-12 items-center justify-center rounded-l-2xl text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="phone" className="h-5 w-5" />
          </button>

          {showDialer && (
            <div className="absolute left-0 top-[60px] z-50 grid w-[590px] grid-cols-[260px_1fr] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
              <div className="border-l border-slate-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowDialer(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </button>

                  <div className="text-right">
                    <p className="text-sm font-black text-slate-950">חייגן</p>
                    <p className="text-[11px] font-bold text-slate-500">
                      חיוג יוצא גם במצב לא פנוי
                    </p>
                  </div>
                </div>

                <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p
                    dir="ltr"
                    className="truncate text-center font-mono text-xl font-black tracking-wide text-slate-950"
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
                      className="flex h-[54px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950 transition hover:border-[#b9945a] hover:bg-[#fff8ed] active:scale-95"
                    >
                      <span className="text-xl font-black leading-5">{digit.key}</span>
                      {digit.letters && (
                        <span className="mt-0.5 text-[9px] font-black text-slate-400">
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
                    className="flex h-11 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    <Icon name="delete" className="h-4 w-4" />
                    מחק
                  </button>

                  <button
                    type="button"
                    onClick={clearNumber}
                    className="h-11 rounded-2xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    נקה
                  </button>

                  <button
                    type="button"
                    onClick={startOutboundCall}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-xs font-black text-white transition hover:bg-emerald-700"
                  >
                    <Icon name="phone" className="h-4 w-4" />
                    {creatingCall ? "מחייג..." : "חייג"}
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-3 text-right">
                  <p className="text-sm font-black text-slate-950">שיחות אחרונות</p>
                  <p className="text-[11px] font-bold text-slate-500">
                    לחיצה על שיחה תכניס את המספר לחייגן
                  </p>
                </div>

                <div className="space-y-2">
                  {recentCalls.map((call) => (
                    <button
                      key={call.id}
                      type="button"
                      onClick={() => selectRecentCall(call)}
                      className="flex h-[52px] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-right shadow-sm transition hover:-translate-y-[1px] hover:border-[#b9945a] hover:bg-[#fffaf2] hover:shadow-md"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                          call.direction === "outbound"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <Icon
                          name={call.direction === "outbound" ? "arrowOut" : "arrowIn"}
                          className="h-4 w-4"
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            dir="ltr"
                            className="font-mono text-sm font-black text-slate-950"
                          >
                            {call.number}
                          </span>
                          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600">
                            {call.label}
                          </span>
                        </div>
                        <p className="truncate text-xs font-bold text-slate-500">
                          משך שיחה {formatShortDuration(call.duration)}
                        </p>
                      </div>

                      <span className="text-xs font-black text-slate-400">
                        {call.time}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          dir="rtl"
          className="hidden h-12 w-[175px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 xl:flex"
        >
          <span className="text-[11px] font-black text-slate-500">
            {isCallActive ? timerLabel : "אין שיחה פעילה"}
          </span>
          <span
            dir="ltr"
            className="min-w-0 truncate font-mono text-sm font-black text-slate-950"
          >
            {activeDisplayNumber}
          </span>
          {isCallActive && (
            <span dir="ltr" className="font-mono text-sm font-black text-red-700">
              {formatDuration(liveStatusSeconds)}
            </span>
          )}
        </div>

        <div className="hidden h-12 items-center gap-1 rounded-2xl border border-slate-200 bg-white px-1 lg:flex">
          {[
            ["headset", "אוזניות"],
            ["keypad", "מקשים"],
            ["clock", "היסטוריה"],
            ["mic", muted ? "בטל השתקה" : "השתק"],
            ["speaker", speakerEnabled ? "כבה רמקול" : "רמקול"],
            ["pause", "המתנה"],
            ["transfer", "העברה"],
            ["user", "איש קשר"],
          ].map(([icon, title]) => {
            const isActiveButton =
              (icon === "mic" && muted) || (icon === "speaker" && speakerEnabled);

            return (
              <button
                key={icon}
                type="button"
                title={title}
                onClick={
                  icon === "keypad" || icon === "clock"
                    ? toggleDialer
                    : icon === "mic"
                    ? toggleMute
                    : icon === "speaker"
                    ? toggleSpeaker
                    : undefined
                }
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-slate-100 ${
                  isActiveButton ? "bg-slate-950 text-white" : "text-slate-950"
                }`}
              >
                <Icon name={icon as "headset"} className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {(currentStatus === "dialing" || currentStatus === "ringing") && (
          <button
            type="button"
            onClick={markAnswered}
            disabled={!!savingStatus || creatingCall}
            dir="rtl"
            className="flex h-12 w-[82px] items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ענה
            <Icon name="check" className="h-4 w-4" />
          </button>
        )}

        {isCallActive && (
          <button
            type="button"
            onClick={finishCall}
            disabled={!!savingStatus || creatingCall}
            dir="rtl"
            className="flex h-12 w-[82px] items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            סיים
            <Icon name="phone" className="h-4 w-4" />
          </button>
        )}
      </div>

      {showEndShiftConfirm && (
        <div
          dir="rtl"
          className="absolute left-0 top-[84px] z-50 w-[365px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
        >
          <p className="text-sm font-black text-slate-950">לסיים משמרת?</p>

          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            האם את/ה בטוח/ה שברצונך לסיים משמרת?
            <br />
            סה״כ זמן עבודה:{" "}
            <span dir="ltr" className="font-mono font-black text-slate-950">
              {formatDuration(shiftSeconds)}
            </span>
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={confirmEndShift}
              disabled={!!savingStatus || creatingCall}
              className="h-11 flex-1 rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              כן, סיום משמרת
            </button>

            <button
              type="button"
              onClick={() => setShowEndShiftConfirm(false)}
              disabled={!!savingStatus || creatingCall}
              className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
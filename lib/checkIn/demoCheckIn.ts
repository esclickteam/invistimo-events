import {
  formatTableLabel,
  giftUrlIfConfigured,
  hostRemainingOptions,
  hostScanIsFullyArrived,
} from "@/lib/checkIn/guestPassState";

export const DEMO_CHECKIN_STORAGE_KEY = "invistimo.demo.checkin.v1";
export const DEMO_CHECKIN_CHANNEL = "invistimo-demo-checkin";

export type DemoCheckInGuest = {
  token: string;
  name: string;
  eventTitle: string;
  coupleNames: string;
  confirmedGuestCount: number;
  checkedInGuestCount: number;
  tableNumber: number | null;
  tableName: string;
  giftCreditUrl: string;
  detailsUrl: string;
};

export const DEMO_CHECKIN_GUESTS: DemoCheckInGuest[] = [
  {
    token: "demoCheckInHadarTwo01",
    name: "הדר",
    eventTitle: "החתונה של נועה ויואב",
    coupleNames: "נועה ויואב",
    confirmedGuestCount: 2,
    checkedInGuestCount: 0,
    tableNumber: 8,
    tableName: "שולחן 8",
    giftCreditUrl: "https://pay.invistimo.com/gifts/demo",
    detailsUrl: "/try/dashboard",
  },
  {
    token: "demoCheckInCohenFour1",
    name: "משפחת כהן",
    eventTitle: "החתונה של נועה ויואב",
    coupleNames: "נועה ויואב",
    confirmedGuestCount: 4,
    checkedInGuestCount: 0,
    tableNumber: 12,
    tableName: "שולחן 12",
    giftCreditUrl: "https://pay.invistimo.com/gifts/demo",
    detailsUrl: "/try/dashboard",
  },
  {
    token: "demoCheckInGiftsYes01",
    name: "משפחת לוי",
    eventTitle: "החתונה של נועה ויואב",
    coupleNames: "נועה ויואב",
    confirmedGuestCount: 2,
    checkedInGuestCount: 0,
    tableNumber: 5,
    tableName: "שולחן 5",
    giftCreditUrl: "https://pay.invistimo.com/gifts/demo",
    detailsUrl: "/try/dashboard",
  },
  {
    token: "demoCheckInGiftsNone1",
    name: "משפחת אברהם",
    eventTitle: "החתונה של מיכל ודני",
    coupleNames: "מיכל ודני",
    confirmedGuestCount: 2,
    checkedInGuestCount: 0,
    tableNumber: 3,
    tableName: "שולחן 3",
    giftCreditUrl: "",
    detailsUrl: "/try/dashboard",
  },
];

export function isDemoCheckInToken(token: unknown): boolean {
  return DEMO_CHECKIN_GUESTS.some((guest) => guest.token === String(token || ""));
}

export function serializeDemoGuest(guest: DemoCheckInGuest) {
  const remaining = Math.max(
    0,
    guest.confirmedGuestCount - guest.checkedInGuestCount
  );
  return {
    id: guest.token,
    name: guest.name,
    phone: "",
    rsvp: "yes",
    confirmedGuestCount: guest.confirmedGuestCount,
    checkedInGuestCount: guest.checkedInGuestCount,
    remaining,
    tableNumber: guest.tableNumber,
    tableName: guest.tableName,
    status: hostScanIsFullyArrived(
      guest.confirmedGuestCount,
      guest.checkedInGuestCount
    )
      ? "FULLY_ARRIVED"
      : guest.checkedInGuestCount > 0
        ? "PARTIALLY_ARRIVED"
        : "NOT_ARRIVED",
    giftCreditUrl: giftUrlIfConfigured(guest.giftCreditUrl),
    eventTitle: guest.eventTitle,
    coupleNames: guest.coupleNames,
    detailsUrl: guest.detailsUrl,
    tableLabel: formatTableLabel(guest),
    quantityOptions: hostRemainingOptions(
      guest.confirmedGuestCount,
      guest.checkedInGuestCount
    ),
  };
}

let memoryDemoState: { guests: DemoCheckInGuest[] } | null = null;

export function defaultDemoCheckInState() {
  return {
    guests: DEMO_CHECKIN_GUESTS.map((guest) => ({ ...guest })),
  };
}

export function readDemoCheckInState(): { guests: DemoCheckInGuest[] } {
  if (typeof window === "undefined") {
    if (!memoryDemoState) memoryDemoState = defaultDemoCheckInState();
    return {
      guests: memoryDemoState.guests.map((guest) => ({ ...guest })),
    };
  }
  try {
    const raw = window.localStorage.getItem(DEMO_CHECKIN_STORAGE_KEY);
    if (!raw) return defaultDemoCheckInState();
    const parsed = JSON.parse(raw);
    const saved = Array.isArray(parsed?.guests) ? parsed.guests : [];
    return {
      guests: DEMO_CHECKIN_GUESTS.map((seed) => {
        const match = saved.find((g: any) => g?.token === seed.token);
        const checkedIn = Number(match?.checkedInGuestCount);
        return {
          ...seed,
          checkedInGuestCount:
            Number.isFinite(checkedIn) && checkedIn > 0
              ? Math.floor(checkedIn)
              : 0,
        };
      }),
    };
  } catch {
    return defaultDemoCheckInState();
  }
}

export function writeDemoCheckInState(state: { guests: DemoCheckInGuest[] }) {
  memoryDemoState = {
    guests: state.guests.map((guest) => ({ ...guest })),
  };
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_CHECKIN_STORAGE_KEY, JSON.stringify(state));
  try {
    window.dispatchEvent(
      new CustomEvent(DEMO_CHECKIN_CHANNEL, { detail: state })
    );
    const channel = new BroadcastChannel(DEMO_CHECKIN_CHANNEL);
    channel.postMessage(state);
    channel.close();
  } catch {
    // ignore
  }
}

export function applyDemoCheckIn(token: string, quantityAdded: number) {
  const state = readDemoCheckInState();
  const guest = state.guests.find((item) => item.token === token);
  if (!guest) return { ok: false as const, error: "GUEST_NOT_FOUND" };

  const quantity = Math.floor(Number(quantityAdded));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false as const, error: "INVALID_QUANTITY" };
  }

  const remaining = guest.confirmedGuestCount - guest.checkedInGuestCount;
  if (quantity > remaining) {
    return { ok: false as const, error: "EXCEEDS_CONFIRMED", guest };
  }

  const previous = guest.checkedInGuestCount;
  guest.checkedInGuestCount = previous + quantity;
  writeDemoCheckInState(state);

  return {
    ok: true as const,
    guest,
    previousCheckedInCount: previous,
    newCheckedInCount: guest.checkedInGuestCount,
    quantityAdded: quantity,
  };
}

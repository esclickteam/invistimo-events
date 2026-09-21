const EXPO_TOKEN_RE = /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/;

export function normalizeExpoPushToken(raw: unknown) {
  const token = String(raw || "").trim();
  if (!EXPO_TOKEN_RE.test(token)) return null;
  return token;
}

export const NATIVE_PUSH_TYPES = [
  "rsvp",
  "guest_message",
  "checkin",
  "seating",
  "event",
] as const;

export const NATIVE_PUSH_SCREENS = [
  "guests",
  "check-in",
  "seating",
  "guest-messages",
  "invitation",
  "event",
  "dashboard",
] as const;

export type NativePushType = (typeof NATIVE_PUSH_TYPES)[number];
export type NativePushScreen = (typeof NATIVE_PUSH_SCREENS)[number];

const TYPE_COPY: Record<NativePushType, { title: string; body: string; screen: NativePushScreen }> =
  {
    rsvp: {
      title: "Invistimo",
      body: "יש עדכון באישורי ההגעה",
      screen: "guests",
    },
    guest_message: {
      title: "Invistimo",
      body: "התקבלה הודעה חדשה מהאורחים",
      screen: "guest-messages",
    },
    checkin: {
      title: "Invistimo",
      body: "יש עדכון בכניסה לאירוע",
      screen: "check-in",
    },
    seating: {
      title: "Invistimo",
      body: "יש עדכון בסידור ההושבה",
      screen: "seating",
    },
    event: {
      title: "Invistimo",
      body: "יש עדכון באירוע",
      screen: "dashboard",
    },
  };

function isType(value: unknown): value is NativePushType {
  return NATIVE_PUSH_TYPES.includes(String(value) as NativePushType);
}

function isScreen(value: unknown): value is NativePushScreen {
  return NATIVE_PUSH_SCREENS.includes(String(value) as NativePushScreen);
}

export function screenPath(screen: NativePushScreen) {
  switch (screen) {
    case "guests":
      return "/(app)/guests";
    case "check-in":
      return "/(app)/check-in";
    case "seating":
      return "/(app)/seating";
    case "guest-messages":
      return "/(app)/more/guest-messages";
    case "invitation":
      return "/(app)/more/invitation";
    case "event":
      return "/(app)/more/event";
    default:
      return "/(app)";
  }
}

export function sanitizeNativePushPayload(input: {
  type?: unknown;
  screen?: unknown;
  title?: unknown;
  body?: unknown;
  data?: unknown;
}) {
  const type = isType(input.type) ? input.type : "event";
  const copy = TYPE_COPY[type];
  const screen = isScreen(input.screen) ? input.screen : copy.screen;

  return {
    title: copy.title,
    body: copy.body,
    sound: "default" as const,
    channelId: "invistimo",
    data: {
      type,
      screen,
    },
  };
}

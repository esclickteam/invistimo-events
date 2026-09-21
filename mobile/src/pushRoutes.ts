export type NativePushScreen =
  | "guests"
  | "check-in"
  | "seating"
  | "guest-messages"
  | "invitation"
  | "event"
  | "dashboard";

const PATHS: Record<NativePushScreen, string> = {
  guests: "/(app)/guests",
  "check-in": "/(app)/check-in",
  seating: "/(app)/seating",
  "guest-messages": "/(app)/more/guest-messages",
  invitation: "/(app)/more/invitation",
  event: "/(app)/more/event",
  dashboard: "/(app)",
};

export function pathForPushScreen(screen: NativePushScreen) {
  return PATHS[screen] || "/(app)";
}

export function isPushScreen(value: unknown): value is NativePushScreen {
  return typeof value === "string" && value in PATHS;
}

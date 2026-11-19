/**
 * Isolated identity for the one RSVP cutover probe.
 * Only a status carrying the probe marker, or a reply that quotes the
 * registered probe wamid, skips guests, events, RSVP, and existing leads.
 * A normal message from the same phone stays on the existing path.
 */

export const CUTOVER_PROBE_ID = "cutover-probe";
export const CUTOVER_PROBE_PHONE_DIGITS = "972526850711";
export const CUTOVER_PROBE_IMAGE_URL = "https://www.invistimo.com/og-invistimo.jpg";
export const CUTOVER_PROBE_TEMPLATE_NAME = "rsvp_invitation_media";
export const CUTOVER_PROBE_PHONE_WINDOW_MS = 2 * 60 * 60 * 1000;

const NO_PRODUCTION_WRITES = Object.freeze({
  customerFile: false,
  customerLeadMessage: false,
  guest: false,
  event: false,
  rsvpStatus: false,
});

export type CutoverProbeRegistry = {
  open: boolean;
  wamids: ReadonlySet<string>;
};

export type CutoverProbeDecision = {
  isolated: boolean;
  duplicate: boolean;
  probeId: string;
  wamid: string;
  contextWamid: string;
  direction: "inbound" | "outbound";
  eventType: "message" | "status";
  providerStatus: string;
  ensureRegistration: boolean;
  writes: {
    customerFile: boolean;
    customerLeadMessage: boolean;
    guest: boolean;
    event: boolean;
    rsvpStatus: boolean;
  };
};

export function emptyCutoverProbeRegistry(): CutoverProbeRegistry {
  return { open: false, wamids: new Set() };
}

export function registerCutoverProbeWamid(
  registry: CutoverProbeRegistry,
  wamid: string
): CutoverProbeRegistry {
  const id = String(wamid || "").trim();
  if (!id) return registry;
  const wamids = new Set(registry.wamids);
  wamids.add(id);
  return { open: true, wamids };
}

export function registryFromRegistrations(
  rows: Array<{ wamid?: string; createdAt?: Date | string | number }>,
  now = Date.now()
): CutoverProbeRegistry {
  const cutoff = now - CUTOVER_PROBE_PHONE_WINDOW_MS;
  let registry = emptyCutoverProbeRegistry();
  for (const row of rows) {
    const createdAt = new Date(row.createdAt || 0).getTime();
    if (!Number.isFinite(createdAt) || createdAt < cutoff) continue;
    registry = registerCutoverProbeWamid(registry, String(row.wamid || ""));
  }
  return registry;
}

export function cutoverProbeImageIsSafe(url = CUTOVER_PROBE_IMAGE_URL) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "www.invistimo.com" &&
      parsed.pathname === "/og-invistimo.jpg" &&
      parsed.search === "" &&
      parsed.username === "" &&
      parsed.password === ""
    );
  } catch {
    return false;
  }
}

export function buildCutoverProbeRequest() {
  return {
    method: "POST" as const,
    path: "/v21.0/1325815400610124/messages",
    body: {
      messaging_product: "whatsapp",
      to: CUTOVER_PROBE_PHONE_DIGITS,
      type: "template",
      template: {
        name: CUTOVER_PROBE_TEMPLATE_NAME,
        language: { code: "he" },
        components: [
          {
            type: "header",
            parameters: [
              { type: "image", image: { link: CUTOVER_PROBE_IMAGE_URL } },
            ],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: "בדיקת מעבר" },
              { type: "text", text: "ללא אירוע" },
              { type: "text", text: "ללא אולם" },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: CUTOVER_PROBE_ID }],
          },
        ],
      },
      biz_opaque_callback_data: CUTOVER_PROBE_ID,
    },
  };
}

function probeMarker(message: any) {
  const chunks = [
    message?.text?.body,
    message?.button?.text,
    message?.button?.payload,
    message?.interactive?.button_reply?.id,
    message?.interactive?.button_reply?.title,
    message?.interactive?.list_reply?.id,
    message?.interactive?.list_reply?.title,
  ];
  return chunks.some((value) => String(value || "").includes(CUTOVER_PROBE_ID));
}

function isolatedDecision(
  partial: Omit<
    CutoverProbeDecision,
    "isolated" | "writes" | "duplicate" | "probeId" | "ensureRegistration"
  > & {
    duplicate?: boolean;
    ensureRegistration?: boolean;
  }
): CutoverProbeDecision {
  return {
    isolated: true,
    duplicate: Boolean(partial.duplicate),
    ensureRegistration: Boolean(partial.ensureRegistration),
    probeId: CUTOVER_PROBE_ID,
    writes: { ...NO_PRODUCTION_WRITES },
    wamid: partial.wamid,
    contextWamid: partial.contextWamid,
    direction: partial.direction,
    eventType: partial.eventType,
    providerStatus: partial.providerStatus,
  };
}

export function classifyCutoverProbeInbound(
  message: any,
  registry: CutoverProbeRegistry
): CutoverProbeDecision | null {
  const wamid = String(message?.id || "").trim();
  const contextWamid = String(message?.context?.id || "").trim();
  const mentioned = probeMarker(message);
  const contextMatches = Boolean(contextWamid) && registry.wamids.has(contextWamid);
  if (!contextMatches && !mentioned) return null;
  return isolatedDecision({
    wamid,
    contextWamid,
    direction: "inbound",
    eventType: "message",
    providerStatus: "",
  });
}

export function classifyCutoverProbeStatus(
  status: any,
  registry: CutoverProbeRegistry
): CutoverProbeDecision | null {
  const wamid = String(status?.id || "").trim();
  const marked =
    String(status?.biz_opaque_callback_data || "") === CUTOVER_PROBE_ID;
  const known = Boolean(wamid) && registry.wamids.has(wamid);
  if (!wamid || (!marked && !known)) return null;
  return isolatedDecision({
    wamid,
    contextWamid: "",
    direction: "outbound",
    eventType: "status",
    providerStatus: String(status?.status || "").trim(),
    ensureRegistration: marked,
  });
}

export function probeEventKey(event: Pick<CutoverProbeDecision, "wamid" | "eventType" | "providerStatus">) {
  return `${event.eventType}|${event.wamid}|${event.providerStatus}`;
}

export function acceptProbeEvent<
  T extends Pick<CutoverProbeDecision, "wamid" | "eventType" | "providerStatus"> & {
    duplicate: boolean;
  },
>(seen: Set<string>, event: T) {
  const key = probeEventKey(event);
  if (seen.has(key)) return { ...event, duplicate: true, stored: false as const };
  seen.add(key);
  return { ...event, duplicate: false, stored: true as const };
}

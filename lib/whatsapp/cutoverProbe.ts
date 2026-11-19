/**
 * Isolated identity for the one RSVP cutover probe.
 * A registered probe wamid, or a reply from the probe phone while that
 * probe is open, never updates guests, events, RSVP, or existing leads.
 */

export const CUTOVER_PROBE_ID = "cutover-probe";
export const CUTOVER_PROBE_PHONE_DIGITS = "972526850711";
export const CUTOVER_PROBE_IMAGE_URL = "https://www.invistimo.com/og-invistimo.jpg";
export const CUTOVER_PROBE_TEMPLATE_NAME = "rsvp_invitation_media";

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

export function whatsappDigits(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `972${digits.slice(1)}`;
  return digits;
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
  partial: Omit<CutoverProbeDecision, "isolated" | "writes" | "duplicate" | "probeId"> & {
    duplicate?: boolean;
  }
): CutoverProbeDecision {
  return {
    isolated: true,
    duplicate: Boolean(partial.duplicate),
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
  const fromProbePhone = whatsappDigits(message?.from) === CUTOVER_PROBE_PHONE_DIGITS;
  const mentioned = probeMarker(message);
  const contextMatches = Boolean(contextWamid) && registry.wamids.has(contextWamid);
  const isolated = contextMatches || mentioned || (registry.open && fromProbePhone);
  if (!isolated) return null;
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
  if (!wamid || !registry.wamids.has(wamid)) return null;
  return isolatedDecision({
    wamid,
    contextWamid: "",
    direction: "outbound",
    eventType: "status",
    providerStatus: String(status?.status || "").trim(),
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

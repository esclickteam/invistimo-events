import { createDialogProvider } from "@/lib/whatsapp/provider/dialogProvider";
import { acceptedMessageId } from "@/lib/whatsapp/provider/errors";

/**
 * Temporary admin-only comparison of one JPEG through 360dialog.
 *
 * WHATSAPP_HEADER_PROBE must be exactly "armed" or nothing is sent.
 * Unset, "off", or any other value is the immediate stop.
 * The provider is always 360dialog, even if WHATSAPP_PROVIDER says otherwise.
 * Delete this module, its route, and the WhatsappHeaderProbe collection
 * after the two phone screenshots are compared.
 */

export const WHATSAPP_HEADER_PROBE_RECIPIENT = "972526850711";
export const WHATSAPP_HEADER_PROBE_TEMPLATE = "rsvp_invitation_media";
export const WHATSAPP_HEADER_PROBE_IMAGE_URL =
  "https://res.cloudinary.com/dnbewcz79/image/upload/v1794826500/invistimo/invitations/mbmp2binlp0r91fqdsb9.jpg";

const BUTTON_SUFFIX = "header-probe?token=display";

export type WhatsappHeaderProbeMode = "link" | "id";

export type WhatsappHeaderProbeRecord = {
  mode: WhatsappHeaderProbeMode;
  state: "reserved" | "sent";
  messageId: string;
  httpStatus: number;
  provider: "dialog";
  errorCode: string;
  errorMessage: string;
  at: string | null;
};

export type WhatsappHeaderProbeStore = {
  list(): Promise<WhatsappHeaderProbeRecord[]>;
  reserve(mode: WhatsappHeaderProbeMode): Promise<"ok" | "duplicate">;
  complete(
    mode: WhatsappHeaderProbeMode,
    result: Omit<WhatsappHeaderProbeRecord, "mode" | "state" | "provider">
  ): Promise<void>;
  release(mode: WhatsappHeaderProbeMode): Promise<void>;
};

export class HeaderProbeError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HeaderProbeError";
    this.status = status;
    this.code = code;
  }
}

export function whatsappHeaderProbeArmed(
  _value = process.env.WHATSAPP_HEADER_PROBE
) {
  // The link and media-id probes showed the same broken header.
  // Keep the route in place for the saved result, but never send again.
  return false;
}

export function whatsappHeaderProbeOnProduction() {
  const vercel = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  if (vercel) return vercel === "production";
  return String(process.env.APP_ENV ?? "").trim().toLowerCase() === "production";
}

function assertMode(value: unknown): WhatsappHeaderProbeMode {
  if (value === "link" || value === "id") return value;
  throw new HeaderProbeError(400, "BAD_MODE", "mode must be link or id");
}

function minimalResult(status: number, body: any) {
  const error = body?.error && typeof body.error === "object" ? body.error : null;
  return {
    httpStatus: status,
    messageId: acceptedMessageId(body),
    errorCode: error?.code != null ? String(error.code).slice(0, 40) : "",
    errorMessage: error?.message ? String(error.message).slice(0, 180) : "",
    at: new Date().toISOString(),
  };
}

function templateComponents(image: { link: string } | { id: string }) {
  return [
    {
      type: "header" as const,
      parameters: [{ type: "image" as const, image }],
    },
    {
      type: "body" as const,
      parameters: [
        { type: "text" as const, text: "בדיקת תצוגה" },
        { type: "text" as const, text: "16.11.2026" },
        { type: "text" as const, text: "בדיקה" },
      ],
    },
    {
      type: "button" as const,
      sub_type: "url" as const,
      index: "0",
      parameters: [{ type: "text" as const, text: BUTTON_SUFFIX }],
    },
  ];
}

async function imageBytes(fetchImpl: typeof fetch) {
  const response = await fetchImpl(WHATSAPP_HEADER_PROBE_IMAGE_URL);
  if (!response.ok) {
    throw new HeaderProbeError(
      502,
      "IMAGE_UNREADABLE",
      "probe image could not be read"
    );
  }
  const type = response.headers.get("content-type") || "";
  if (!type.startsWith("image/jpeg")) {
    throw new HeaderProbeError(502, "IMAGE_TYPE", "probe image is not a jpeg");
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function runWhatsappHeaderProbe(
  modeInput: unknown,
  deps: {
    store: WhatsappHeaderProbeStore;
    fetch?: typeof fetch;
    armed?: boolean;
    production?: boolean;
  }
) {
  const mode = assertMode(modeInput);
  if (!deps.production) {
    throw new HeaderProbeError(
      403,
      "PROBE_NOT_PRODUCTION",
      "probe sends only from production"
    );
  }
  if (!deps.armed) {
    throw new HeaderProbeError(409, "PROBE_DISARMED", "probe is disarmed");
  }

  const reserved = await deps.store.reserve(mode);
  if (reserved === "duplicate") {
    throw new HeaderProbeError(
      409,
      "PROBE_ALREADY_SENT",
      "this probe mode was already used"
    );
  }

  const fetchImpl = deps.fetch ?? fetch;
  const provider = createDialogProvider({ fetch: fetchImpl });
  try {
    let image: { link: string } | { id: string };
    if (mode === "link") {
      image = { link: WHATSAPP_HEADER_PROBE_IMAGE_URL };
    } else {
      const bytes = await imageBytes(fetchImpl);
      const mediaId = await provider.uploadHeaderMedia({
        bytes,
        mime: "image/jpeg",
        filename: "header.jpg",
      });
      image = { id: mediaId };
    }

    const sent = await provider.sendTemplate({
      to: WHATSAPP_HEADER_PROBE_RECIPIENT,
      templateName: WHATSAPP_HEADER_PROBE_TEMPLATE,
      languageCode: "he",
      components: templateComponents(image),
    });
    const saved = {
      ...minimalResult(200, sent.providerResponse),
      messageId: sent.messageId,
    };
    await deps.store.complete(mode, saved);
    return {
      mode,
      provider: "dialog" as const,
      recipientLocked: true,
      messageId: saved.messageId,
      httpStatus: saved.httpStatus,
      at: saved.at,
    };
  } catch (error) {
    await deps.store.release(mode);
    if (error instanceof HeaderProbeError) throw error;
    const status = Number((error as any)?.httpStatus || 502);
    const body = (error as any)?.providerResponse;
    const minimal = minimalResult(status, body);
    throw new HeaderProbeError(
      status === 200 ? 502 : status,
      "PROBE_REJECTED",
      minimal.errorMessage || "probe was not accepted"
    );
  }
}

export function publicProbeList(records: WhatsappHeaderProbeRecord[]) {
  return records
    .filter((record) => record.state === "sent")
    .map((record) => ({
      mode: record.mode,
      messageId: record.messageId,
      httpStatus: record.httpStatus,
      provider: record.provider,
      at: record.at,
      errorCode: record.errorCode || "",
    }));
}

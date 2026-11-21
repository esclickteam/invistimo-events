/**
 * Header bytes for a WhatsApp template.
 *
 * The original buffer is returned as-is when it is a JPEG or PNG inside
 * Meta's limits. There is no canvas, padding, crop, or resize step.
 *
 * The chat bubble is still drawn by WhatsApp inside the approved template's
 * image header. Link and media-id delivery of the same 1080×1920 JPEG both
 * rendered inside that frame on mobile and on WhatsApp Web. This module
 * cannot change that frame.
 */

export const WHATSAPP_HEADER_MAX_BYTES = 5 * 1024 * 1024;
export const WHATSAPP_HEADER_MAX_SIDE = 4096;

export const WHATSAPP_TEMPLATE_HEADER_LAYOUT = {
  controlledBy: "whatsapp-template-header",
  resized: false,
  padded: false,
  cropped: false,
} as const;

export type HeaderKind = "jpeg" | "png" | "other";

export type HeaderDecision =
  | {
      action: "keep";
      kind: "jpeg" | "png";
      resized: false;
      padded: false;
      cropped: false;
      layoutControlledBy: "whatsapp-template-header";
    }
  | { action: "reject"; reason: "UNSUPPORTED_TYPE" | "OUT_OF_LIMITS" | "EMPTY" };

export function sniffHeaderKind(bytes: Buffer): HeaderKind {
  if (!bytes?.length) return "other";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(png)) return "png";
  return "other";
}

export function decideWhatsappHeader(input: {
  kind: HeaderKind;
  width: number;
  height: number;
  byteLength: number;
}): HeaderDecision {
  if (!input.byteLength) return { action: "reject", reason: "EMPTY" };
  if (input.kind !== "jpeg" && input.kind !== "png") {
    return { action: "reject", reason: "UNSUPPORTED_TYPE" };
  }
  if (
    input.byteLength > WHATSAPP_HEADER_MAX_BYTES ||
    input.width < 1 ||
    input.height < 1 ||
    input.width > WHATSAPP_HEADER_MAX_SIDE ||
    input.height > WHATSAPP_HEADER_MAX_SIDE
  ) {
    return { action: "reject", reason: "OUT_OF_LIMITS" };
  }
  return {
    action: "keep",
    kind: input.kind,
    resized: false,
    padded: false,
    cropped: false,
    layoutControlledBy: "whatsapp-template-header",
  };
}

export class WhatsappHeaderError extends Error {
  readonly reason: "UNSUPPORTED_TYPE" | "OUT_OF_LIMITS" | "EMPTY" | "UNREADABLE";

  constructor(
    reason: WhatsappHeaderError["reason"],
    message: string
  ) {
    super(message);
    this.name = "WhatsappHeaderError";
    this.reason = reason;
  }
}

export type PreparedWhatsappHeader = {
  bytes: Buffer;
  mime: "image/jpeg" | "image/png";
  width: number;
  height: number;
  resized: false;
  padded: false;
  cropped: false;
  layoutControlledBy: "whatsapp-template-header";
};

/** Reads the file. Returns the same bytes. Never writes a new image. */
export async function readWhatsappHeader(bytes: Buffer): Promise<PreparedWhatsappHeader> {
  const kind = sniffHeaderKind(bytes);
  let width = 0;
  let height = 0;
  if (kind === "jpeg" || kind === "png") {
    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(bytes, { failOn: "none", animated: false }).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
    } catch {
      throw new WhatsappHeaderError("UNREADABLE", "header image could not be read");
    }
  }
  const decision = decideWhatsappHeader({
    kind,
    width,
    height,
    byteLength: bytes.length,
  });
  if (decision.action === "reject") {
    throw new WhatsappHeaderError(decision.reason, `header image ${decision.reason}`);
  }
  return {
    bytes,
    mime: decision.kind === "png" ? "image/png" : "image/jpeg",
    width,
    height,
    resized: false,
    padded: false,
    cropped: false,
    layoutControlledBy: "whatsapp-template-header",
  };
}

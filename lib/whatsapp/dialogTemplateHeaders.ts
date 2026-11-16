/**
 * Reads the live 360dialog template list and keeps only header facts.
 * The API key never leaves the server and is not part of the result.
 */

const TEMPLATE_NAMES = [
  "rsvp_invitation_media",
  "rsvp_reminder_invistimo",
  "save_the_date_image_he",
  "event_invitation",
  "event_invitation_image_he",
] as const;

const TEMPLATES_URL = "https://waba-v2.360dialog.io/v1/configs/templates?limit=1000";

export type DialogTemplateHeaderSummary = {
  name: string;
  language: string;
  status: string;
  category: string;
  headerFormat: string;
  exampleHost: string;
  bodyVariables: number;
  buttonTypes: string[];
  buttonUrlHost: string;
};

function asList(payload: any) {
  if (Array.isArray(payload?.waba_templates)) return payload.waba_templates;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function hostOf(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).hostname;
  } catch {
    return "";
  }
}

export function summarizeDialogTemplateHeaders(payload: unknown): DialogTemplateHeaderSummary[] {
  const wanted = new Set<string>(TEMPLATE_NAMES);
  return asList(payload)
    .filter((template: any) => wanted.has(String(template?.name || "")))
    .map((template: any) => {
      const components = Array.isArray(template?.components) ? template.components : [];
      const header = components.find(
        (component: any) => String(component?.type || "").toUpperCase() === "HEADER"
      );
      const body = components.find(
        (component: any) => String(component?.type || "").toUpperCase() === "BODY"
      );
      const buttons = components.find(
        (component: any) => String(component?.type || "").toUpperCase() === "BUTTONS"
      );
      const buttonList = Array.isArray(buttons?.buttons) ? buttons.buttons : [];
      const urlButton = buttonList.find(
        (button: any) => String(button?.type || "").toUpperCase() === "URL"
      );
      const handle = header?.example?.header_handle;
      const example = Array.isArray(handle) ? handle[0] : handle;
      return {
        name: String(template?.name || ""),
        language: String(template?.language || ""),
        status: String(template?.status || ""),
        category: String(template?.category || ""),
        headerFormat: String(header?.format || "NONE"),
        exampleHost: hostOf(example),
        bodyVariables: (String(body?.text || "").match(/\{\{\d+\}\}/g) || []).length,
        buttonTypes: buttonList.map((button: any) => String(button?.type || "").toUpperCase()),
        buttonUrlHost: hostOf(urlButton?.url),
      };
    });
}

export function invistimoExpectedHeader(name: string) {
  if (
    name === "rsvp_invitation_media" ||
    name === "rsvp_reminder_invistimo" ||
    name === "save_the_date_image_he" ||
    name === "event_invitation" ||
    name === "event_invitation_image_he"
  ) {
    return {
      headerFormat: "IMAGE",
      sendsImageHeader: true,
      sendsUrlButton: name !== "save_the_date_image_he",
    };
  }
  return { headerFormat: "NONE", sendsImageHeader: false, sendsUrlButton: false };
}

export async function readLiveDialogTemplateHeaders(
  fetchImpl: typeof fetch = fetch,
  apiKey = process.env.WHATSAPP_API_KEY || process.env.D360_API_KEY || ""
) {
  const key = String(apiKey).trim();
  if (!key) {
    return { ok: false as const, status: 0, templates: [], error: "KEY_MISSING" };
  }
  const response = await fetchImpl(TEMPLATES_URL, {
    method: "GET",
    headers: { "D360-API-KEY": key },
  });
  if (!response.ok) {
    return { ok: false as const, status: response.status, templates: [], error: "TEMPLATES_UNAVAILABLE" };
  }
  const payload = await response.json().catch(() => ({}));
  return {
    ok: true as const,
    status: response.status,
    templates: summarizeDialogTemplateHeaders(payload),
    error: "",
  };
}

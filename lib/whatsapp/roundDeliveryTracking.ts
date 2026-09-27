import mongoose from "mongoose";
import RoundGuestDelivery, {
  type WhatsappDeliveryStatus,
} from "@/models/RoundGuestDelivery";

/* ======================================================
   REASON CODES
====================================================== */

export const WHATSAPP_REASON_LABELS: Record<string, string> = {
  MISSING_PHONE: "חסר מספר טלפון",
  INVALID_PHONE: "מספר טלפון לא תקין",
  MISSING_GUEST_TOKEN: "חסר טוקן אישי לאורח – לא ניתן לבנות קישור אישי",
  MISSING_TEMPLATE_VARIABLE: "חסר משתנה חובה בתבנית",
  TEMPLATE_ERROR: "שגיאת תבנית WhatsApp",
  MEDIA_ERROR: "שגיאה בתמונת ההזמנה",
  WHATSAPP_NOT_CONNECTED: "WhatsApp לא מחובר (מפתח API חסר / לא תקין)",
  WABA_ERROR: "שגיאת חשבון WhatsApp Business",
  BLOCKED_BY_SAFETY_GATE: "נחסם ע״י הגנת סביבה (לא Production)",
  ALREADY_SENT: "כבר נשלח לאורח בסבב זה",
  DUPLICATE: "כפילות – הודעה זהה כבר קיימת בתור",
  QUEUE_ERROR: "שגיאה בהכנסה לתור השליחה",
  ROUND_CANCELLED: "הסבב בוטל לפני השליחה לאורח",
  WORKER_ERROR: "שגיאת מערכת בזמן עיבוד הסבב",
  PROVIDER_ERROR: "שגיאת ספק WhatsApp",
  RATE_LIMITED: "חריגה ממגבלת קצב שליחה של Meta",
  RECIPIENT_UNDELIVERABLE: "לא ניתן למסור למספר ב-WhatsApp",
  META_MARKETING_LIMIT: "Meta לא מסרה – מגבלת הודעות שיווקיות לנמען",
  META_EXPERIMENT: "Meta לא מסרה – המספר משתתף בניסוי של Meta",
  RECIPIENT_OPTED_OUT: "הנמען ביקש לא לקבל הודעות שיווקיות",
  OUTSIDE_SERVICE_WINDOW: "מחוץ לחלון השיחה של WhatsApp",
  WHATSAPP_DELIVERY_FAILED: "Meta דיווחה על כשל מסירה",
};

export const SMS_REASON_LABELS: Record<string, string> = {
  NO_PHONE: "אין מספר טלפון",
  INVALID_PHONE: "מספר לא תקין ל-SMS",
  OPTED_OUT: "הנמען ביקש לא לקבל הודעות",
  BLACKLISTED: "המספר חסום לתקשורת",
  ALREADY_RESPONDED: "האורח כבר השיב לאישור ההגעה",
  NOT_IN_AUDIENCE_ANYMORE: "האורח כבר לא בקהל הסבב (סטטוס RSVP השתנה)",
  GUEST_DELETED: "האורח נמחק",
  INVITATION_NOT_FOUND: "ההזמנה לא נמצאה",
  WHATSAPP_SUCCEEDED: "WhatsApp נמסר בסוף – אין צורך ב-SMS",
  WHATSAPP_ALREADY_SENT: "WhatsApp כבר נשלח לאורח בסבב זה",
  ROUND_CANCELLED: "הסבב בוטל",
  NO_SMS_TEMPLATE: "אין נוסח SMS לסוג סבב זה",
  MISSING_PERSONAL_LINK: "חסר קישור אישי לאורח – לא נשלח קישור כללי",
  MESSAGE_TOO_LONG: "ההודעה ארוכה מ-2 חלקי SMS",
  NO_SMS_BALANCE: "אין יתרת הודעות SMS",
  BLOCKED_BY_SAFETY_GATE: "נחסם ע״י הגנת סביבה (לא Production)",
  FALLBACK_WINDOW_EXPIRED: "חלון ה-fallback עבר",
  EVENT_PASSED: "האירוע כבר עבר",
  PROVIDER_REJECTED: "ספק ה-SMS דחה את ההודעה",
  PROVIDER_HTTP_ERROR: "שגיאת שרת בספק ה-SMS",
  PROVIDER_UNREACHABLE: "לא ניתן להתחבר לספק ה-SMS",
  PROVIDER_OUTCOME_UNKNOWN:
    "לא התקבלה תשובה ברורה מספק ה-SMS – לא ידוע אם ההודעה התקבלה, לא נשלח שוב כדי למנוע כפילות",
  SMS_NOT_CONFIGURED: "ספק ה-SMS לא מוגדר בשרת",
  DISPATCH_OUTCOME_UNKNOWN:
    "השרת נעצר באמצע השליחה – תוצאה לא ידועה, לא נשלח שוב כדי למנוע כפילות",
  SUPERSEDED_BY_RESEND: "בוצעה שליחה חוזרת – הגיבוי נבדק בניסיון החדש",
};

export const HISTORICAL_REASON_TEXT = "סיבה לא זמינה – נתון היסטורי";

export function getWhatsappReasonLabel(code?: string | null) {
  if (!code) return "";
  return WHATSAPP_REASON_LABELS[code] || code;
}

export function getSmsReasonLabel(code?: string | null) {
  if (!code) return "";
  return SMS_REASON_LABELS[code] || code;
}

/* ======================================================
   ERROR CLASSIFICATION
====================================================== */

const META_CODE_REASONS: Record<string, string> = {
  "131026": "RECIPIENT_UNDELIVERABLE",
  "131049": "META_MARKETING_LIMIT",
  "130472": "META_EXPERIMENT",
  "131050": "RECIPIENT_OPTED_OUT",
  "131047": "OUTSIDE_SERVICE_WINDOW",
  "131008": "MISSING_TEMPLATE_VARIABLE",
  "131009": "MISSING_TEMPLATE_VARIABLE",
  "100": "TEMPLATE_ERROR",
  "132000": "TEMPLATE_ERROR",
  "132001": "TEMPLATE_ERROR",
  "132005": "TEMPLATE_ERROR",
  "132007": "TEMPLATE_ERROR",
  "132012": "TEMPLATE_ERROR",
  "132015": "TEMPLATE_ERROR",
  "132016": "TEMPLATE_ERROR",
  "131053": "MEDIA_ERROR",
  "131000": "PROVIDER_ERROR",
  "130429": "RATE_LIMITED",
  "131048": "RATE_LIMITED",
  "131056": "RATE_LIMITED",
  "190": "WHATSAPP_NOT_CONNECTED",
  "10": "WABA_ERROR",
  "368": "WABA_ERROR",
  "131031": "WABA_ERROR",
  "131042": "WABA_ERROR",
  "131045": "WABA_ERROR",
  "131021": "INVALID_PHONE",
};

export function reasonForMetaCode(code?: string | null, fallback = "PROVIDER_ERROR") {
  const clean = String(code ?? "").trim();
  return (clean && META_CODE_REASONS[clean]) || fallback;
}

export type TemplateVariableInfo = {
  templateName?: string;
  component: string;
  index: number;
  variable: string;
  source: string;
  detail?: string;
};

export type WhatsappOutcome = {
  status: "FAILED" | "NOT_SENT";
  reasonCode: string;
  reasonMessage: string;
  errorCode: string | null;
  errorMessage: string;
  templateVariable?: TemplateVariableInfo | null;
};

const TEMPLATE_COMPONENT_LABELS: Record<string, string> = {
  header: "כותרת",
  body: "גוף ההודעה",
  button: "כפתור URL",
};

export function describeTemplateVariable(info?: TemplateVariableInfo | null) {
  if (!info) return "";
  const component = TEMPLATE_COMPONENT_LABELS[info.component] || info.component;
  return `${component} ${info.variable} (מקור: ${info.source})`;
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractProviderError(err: any) {
  let response = err?.providerResponse ?? null;
  const message = String(err?.message ?? err ?? "");

  if (!response) {
    const jsonStart = message.indexOf("{");
    if (jsonStart >= 0) response = tryParseJson(message.slice(jsonStart));
  }

  const metaError = response?.error ?? response?.errors?.[0] ?? null;
  let code: string | null =
    metaError?.code != null ? String(metaError.code) : null;

  const providerMessage = [
    metaError?.message || metaError?.title || "",
    metaError?.error_data?.details || metaError?.details || "",
  ]
    .filter(Boolean)
    .join(" – ");

  if (!code) {
    const match = (providerMessage || message).match(/\(#(\d+)\)/);
    if (match) code = match[1];
  }

  return { response, code, providerMessage };
}

/**
 * מסווג שגיאה משליחת WhatsApp סינכרונית.
 * NOT_SENT = נעצר אצלנו לפני שהגיע לספק.
 * FAILED  = הייתה פנייה לספק והיא נכשלה.
 */
export function classifyWhatsappSendError(err: any): WhatsappOutcome {
  const message = String(err?.message ?? err ?? "").trim() || "UNKNOWN_ERROR";

  const notSent = (reasonCode: string, detail = message): WhatsappOutcome => ({
    status: "NOT_SENT",
    reasonCode,
    reasonMessage: getWhatsappReasonLabel(reasonCode),
    errorCode: null,
    errorMessage: detail,
  });

  if (err?.code === "MISSING_TEMPLATE_VARIABLE" && err?.templateVariable) {
    const templateVariable = err.templateVariable as TemplateVariableInfo;
    return {
      ...notSent("MISSING_TEMPLATE_VARIABLE"),
      reasonMessage: `${getWhatsappReasonLabel("MISSING_TEMPLATE_VARIABLE")}: ${describeTemplateVariable(templateVariable)}`,
      templateVariable,
    };
  }
  if (
    message.startsWith("EXTERNAL_SENDS_DISABLED") ||
    message.startsWith("PHONE_NOT_IN_EXTERNAL_SENDS")
  ) {
    return notSent("BLOCKED_BY_SAFETY_GATE");
  }
  if (message.includes("Missing env var: WHATSAPP_API_KEY")) {
    return notSent("WHATSAPP_NOT_CONNECTED");
  }
  if (message === "MISSING_PHONE" || message === "Missing field: to") {
    return notSent("MISSING_PHONE");
  }
  if (message.startsWith("Invalid phone number")) {
    return notSent("INVALID_PHONE");
  }
  if (
    message.startsWith("Missing field: headerImageUrl") ||
    message.startsWith("Invalid headerImageUrl")
  ) {
    return notSent("MEDIA_ERROR");
  }
  if (
    message.startsWith("Missing field:") ||
    message.startsWith("Invalid rsvpLink")
  ) {
    return notSent("MISSING_TEMPLATE_VARIABLE");
  }
  if (
    message.startsWith("Unsupported templateName") ||
    message === "MISSING_TEMPLATE_NAME" ||
    message === "MISSING_WHATSAPP_TEMPLATE_NAME"
  ) {
    return notSent("TEMPLATE_ERROR");
  }

  const { code, providerMessage } = extractProviderError(err);
  const reasonCode = reasonForMetaCode(code);

  return {
    status: "FAILED",
    reasonCode,
    reasonMessage: getWhatsappReasonLabel(reasonCode),
    errorCode: code,
    errorMessage: providerMessage || message,
  };
}

/* ======================================================
   STATUS TRANSITIONS (rank-guarded, atomic)
====================================================== */

const ALLOWED_PREVIOUS: Record<WhatsappDeliveryStatus, WhatsappDeliveryStatus[]> = {
  QUEUED: [],
  SENDING: ["QUEUED"],
  SENT: ["QUEUED", "SENDING"],
  FAILED: ["QUEUED", "SENDING", "SENT"],
  NOT_SENT: ["QUEUED", "SENDING"],
  DELIVERED: ["QUEUED", "SENDING", "SENT", "FAILED"],
  READ: ["QUEUED", "SENDING", "SENT", "FAILED", "DELIVERED"],
};

export function getFallbackGraceMs() {
  const raw = Number(process.env.WHATSAPP_SMS_FALLBACK_GRACE_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 2 * 60 * 1000;
}

type TransitionInput = {
  filter: Record<string, any>;
  next: WhatsappDeliveryStatus;
  at: Date;
  event: string;
  fields?: Record<string, any>;
  reasonCode?: string | null;
  message?: string | null;
  meta?: Record<string, any> | null;
};

async function transitionWhatsapp({
  filter,
  next,
  at,
  event,
  fields = {},
  reasonCode = null,
  message = null,
  meta = null,
}: TransitionInput) {
  const set: Record<string, any> = {
    "whatsapp.status": next,
    "whatsapp.updatedAt": at,
  };

  for (const [key, value] of Object.entries(fields)) {
    set[`whatsapp.${key}`] = value;
  }

  if (next === "FAILED") {
    set["sms.notBefore"] = new Date(at.getTime() + getFallbackGraceMs());
  }
  if (next === "NOT_SENT") {
    set["sms.notBefore"] = at;
  }

  return RoundGuestDelivery.updateMany(
    {
      ...filter,
      "whatsapp.status": { $in: ALLOWED_PREVIOUS[next] },
    },
    {
      $set: set,
      $push: {
        history: {
          at,
          channel: "whatsapp",
          event,
          status: next,
          reasonCode,
          message,
          meta,
        },
      },
    }
  );
}

function logTrackingError(where: string, err: any) {
  console.error(`⚠️ ROUND DELIVERY TRACKING (${where}) FAILED:`, err?.message || err);
}

/* ======================================================
   DECISIONS: guest intended for a round
====================================================== */

export type RoundDecisionOutcome =
  | {
      kind: "queued";
      queueId: any;
      idempotencyKey: string;
      phone: string;
    }
  | {
      kind: "not_sent";
      reasonCode: string;
      errorMessage?: string | null;
    };

export type RoundDecision = {
  invitationId: any;
  guest: { _id: any; name?: string; phone?: string | null; guestsCount?: number };
  type: string;
  round: number;
  source: "immediate" | "scheduled" | "pre_rsvp";
  scheduleId?: any;
  templateName?: string | null;
  outcome: RoundDecisionOutcome;
  at?: Date;
};

export function getTrackingRoundKey(type: string, round: number) {
  return `${type}:${round}`;
}

function toObjectId(value: any) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const str = String(value);
  return mongoose.Types.ObjectId.isValid(str)
    ? new mongoose.Types.ObjectId(str)
    : null;
}

function buildDecisionDoc(decision: RoundDecision) {
  const at = decision.at || new Date();
  const outcome = decision.outcome;
  const base = {
    type: decision.type,
    round: decision.round,
    source: decision.source,
    scheduleId: toObjectId(decision.scheduleId),
    guestName: String(decision.guest?.name || ""),
    phone: String(decision.guest?.phone || ""),
    guestsCount: Number(decision.guest?.guestsCount || 0),
    sms: { status: null, attempts: 0, notBefore: outcome.kind === "not_sent" ? at : null },
  };

  const intendedEntry = {
    at,
    channel: "whatsapp",
    event: "WA_INTENDED",
    status: null,
    reasonCode: null,
    message: null,
    meta: { source: decision.source },
  };

  if (outcome.kind === "queued") {
    return {
      ...base,
      whatsapp: {
        status: "QUEUED",
        queueId: toObjectId(outcome.queueId),
        idempotencyKey: outcome.idempotencyKey,
        templateName: decision.templateName || null,
        intendedAt: at,
        updatedAt: at,
      },
      history: [
        intendedEntry,
        {
          at,
          channel: "whatsapp",
          event: "WA_QUEUED",
          status: "QUEUED",
          reasonCode: null,
          message: null,
          meta: { queueId: String(outcome.queueId || "") },
        },
      ],
    };
  }

  const reasonMessage = getWhatsappReasonLabel(outcome.reasonCode);

  return {
    ...base,
    whatsapp: {
      status: "NOT_SENT",
      reasonCode: outcome.reasonCode,
      reasonMessage,
      errorMessage: outcome.errorMessage || null,
      templateName: decision.templateName || null,
      intendedAt: at,
      notSentAt: at,
      updatedAt: at,
    },
    history: [
      intendedEntry,
      {
        at,
        channel: "whatsapp",
        event: "WA_NOT_SENT",
        status: "NOT_SENT",
        reasonCode: outcome.reasonCode,
        message: outcome.errorMessage || reasonMessage,
        meta: null,
      },
    ],
  };
}

/**
 * שומר את ההחלטה לכל אורח מיועד בזמן האירוע.
 * $setOnInsert — הרצה חוזרת (retry / restart) לא דורסת רשומה קיימת.
 */
export async function recordRoundDecisions(decisions: RoundDecision[]) {
  if (!decisions.length) return;

  try {
    const ops: any[] = [];
    const newAttemptOps: any[] = [];

    for (const decision of decisions) {
      const invitationId = toObjectId(decision.invitationId);
      const guestId = toObjectId(decision.guest?._id);
      if (!invitationId || !guestId) continue;

      const filter = {
        invitationId,
        guestId,
        roundKey: getTrackingRoundKey(decision.type, decision.round),
      };
      const doc = buildDecisionDoc(decision);

      ops.push({
        updateOne: { filter, update: { $setOnInsert: doc }, upsert: true },
      });

      if (decision.outcome.kind === "queued") {
        const queueId = toObjectId(decision.outcome.queueId);
        if (queueId) {
          newAttemptOps.push({
            updateOne: {
              filter: { ...filter, "whatsapp.queueId": { $ne: queueId } },
              update: buildNewAttemptPipeline(decision, doc, decision.at || new Date()),
            },
          });
        }
      }
    }

    for (let i = 0; i < ops.length; i += 500) {
      await RoundGuestDelivery.bulkWrite(ops.slice(i, i + 500), {
        ordered: false,
      });
    }

    // After the upserts: a freshly inserted record already carries this queueId and is not matched.
    for (let i = 0; i < newAttemptOps.length; i += 500) {
      await RoundGuestDelivery.collection.bulkWrite(newAttemptOps.slice(i, i + 500), {
        ordered: false,
      });
    }
  } catch (err) {
    logTrackingError("recordRoundDecisions", err);
  }
}

/** SMS state of a new attempt: nothing decided yet. */
function freshSmsState() {
  return {
    status: null,
    reasonCode: null,
    reasonMessage: null,
    idempotencyKey: null,
    notBefore: null,
    lockId: null,
    lockedAt: null,
    dispatchStartedAt: null,
    attempts: 0,
    phone: null,
    text: null,
    parts: 0,
    provider: null,
    providerMessageId: null,
    providerStatus: null,
    providerResponse: null,
    httpStatus: null,
    unknownAt: null,
    errorCode: null,
    errorMessage: null,
    triggeredAt: null,
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
    skippedAt: null,
  };
}

/**
 * Explicit resend (a new WhatsappQueue row for a guest+round that already has a record):
 * archive the current attempt untouched and restart both channels, so the fallback worker
 * evaluates the new attempt independently. Duplicate recordings of the same queue row never match.
 */
function buildNewAttemptPipeline(decision: RoundDecision, doc: any, at: Date) {
  const current = { $ifNull: ["$attempt", 1] };
  const next = { $add: [current, 1] };
  const queueId = String((decision.outcome as any).queueId || "");
  const entry = (event: string, status: string | null, message: string | null) => ({
    at: { $literal: at },
    channel: "whatsapp",
    event: { $literal: event },
    status: { $literal: status },
    reasonCode: null,
    message: { $literal: message },
    meta: { queueId: { $literal: queueId }, source: { $literal: decision.source } },
    attempt: next,
  });

  return [
    {
      $set: {
        previousAttempts: {
          $concatArrays: [
            { $ifNull: ["$previousAttempts", []] },
            [{ attempt: current, whatsapp: "$whatsapp", sms: "$sms", archivedAt: { $literal: at } }],
          ],
        },
        attempt: next,
        source: { $literal: decision.source },
        scheduleId: { $literal: doc.scheduleId },
        phone: { $literal: doc.phone },
        guestName: { $literal: doc.guestName },
        guestsCount: { $literal: doc.guestsCount },
        whatsapp: { $literal: doc.whatsapp },
        sms: { $literal: freshSmsState() },
        history: {
          $concatArrays: [
            { $ifNull: ["$history", []] },
            [
              entry("WA_ATTEMPT_STARTED", null, "שליחה חוזרת – ניסיון חדש"),
              entry("WA_QUEUED", "QUEUED", null),
            ],
          ],
        },
      },
    },
  ];
}

/* ======================================================
   SEND RESULTS (from workers)
====================================================== */

function queueFilter({
  queueId,
  idempotencyKey,
}: {
  queueId?: any;
  idempotencyKey?: string | null;
}) {
  const id = toObjectId(queueId);
  if (id) return { "whatsapp.queueId": id };
  if (idempotencyKey) return { "whatsapp.idempotencyKey": idempotencyKey };
  return null;
}

export async function recordWhatsappSendSuccess({
  queueId,
  idempotencyKey,
  wamid,
  at = new Date(),
}: {
  queueId?: any;
  idempotencyKey?: string | null;
  wamid?: string | null;
  at?: Date;
}) {
  const filter = queueFilter({ queueId, idempotencyKey });
  if (!filter) return;

  try {
    await transitionWhatsapp({
      filter,
      next: "SENT",
      at,
      event: "WA_SENT",
      fields: { wamid: wamid || null, attemptedAt: at, sentAt: at },
      meta: wamid ? { wamid } : null,
    });
  } catch (err) {
    logTrackingError("recordWhatsappSendSuccess", err);
  }
}

export async function recordWhatsappSendFailure({
  queueId,
  idempotencyKey,
  error,
  outcome,
  at = new Date(),
}: {
  queueId?: any;
  idempotencyKey?: string | null;
  error?: any;
  outcome?: WhatsappOutcome;
  at?: Date;
}) {
  const filter = queueFilter({ queueId, idempotencyKey });
  if (!filter) return;

  const result = outcome || classifyWhatsappSendError(error);

  try {
    await transitionWhatsapp({
      filter,
      next: result.status,
      at,
      event: result.status === "FAILED" ? "WA_FAILED" : "WA_NOT_SENT",
      reasonCode: result.reasonCode,
      message: result.errorMessage,
      meta:
        result.errorCode || result.templateVariable
          ? {
              ...(result.errorCode ? { errorCode: result.errorCode } : {}),
              ...(result.templateVariable ? { templateVariable: result.templateVariable } : {}),
            }
          : null,
      fields: {
        reasonCode: result.reasonCode,
        reasonMessage: result.reasonMessage,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        templateVariable: result.templateVariable || null,
        attemptedAt: result.status === "FAILED" ? at : null,
        ...(result.status === "FAILED" ? { failedAt: at } : { notSentAt: at }),
      },
    });
  } catch (err) {
    logTrackingError("recordWhatsappSendFailure", err);
  }
}

/* ======================================================
   WEBHOOK (Meta / 360dialog status callbacks)
====================================================== */

export async function applyWhatsappWebhookStatus({
  wamids,
  state,
  at,
  errorCode,
  errorMessage,
}: {
  wamids: string[];
  state: string;
  at: Date;
  errorCode?: string | number | null;
  errorMessage?: string | null;
}) {
  const values = wamids.filter(Boolean);
  if (!values.length) return;

  const filter = { "whatsapp.wamid": { $in: values } };

  try {
    if (state === "sent") {
      await transitionWhatsapp({
        filter,
        next: "SENT",
        at,
        event: "WA_WEBHOOK_SENT",
        fields: { sentAt: at },
      });
      return;
    }

    if (state === "delivered") {
      await RoundGuestDelivery.updateMany(
        { ...filter, "whatsapp.deliveredAt": null },
        { $set: { "whatsapp.deliveredAt": at } }
      );
      await transitionWhatsapp({
        filter,
        next: "DELIVERED",
        at,
        event: "WA_WEBHOOK_DELIVERED",
      });
      return;
    }

    if (state === "read") {
      await RoundGuestDelivery.updateMany(
        { ...filter, "whatsapp.readAt": null },
        { $set: { "whatsapp.readAt": at } }
      );
      await transitionWhatsapp({
        filter,
        next: "READ",
        at,
        event: "WA_WEBHOOK_READ",
      });
      return;
    }

    if (state === "failed") {
      const code = errorCode != null && errorCode !== "" ? String(errorCode) : null;
      const reasonCode = reasonForMetaCode(code, "WHATSAPP_DELIVERY_FAILED");
      await transitionWhatsapp({
        filter,
        next: "FAILED",
        at,
        event: "WA_WEBHOOK_FAILED",
        reasonCode,
        message: errorMessage || null,
        meta: code ? { errorCode: code } : null,
        fields: {
          failedAt: at,
          reasonCode,
          reasonMessage: getWhatsappReasonLabel(reasonCode),
          errorCode: code,
          errorMessage: errorMessage || null,
        },
      });
    }
  } catch (err) {
    logTrackingError("applyWhatsappWebhookStatus", err);
  }
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelnyxVoiceEvent = {
  data?: {
    id?: string;
    event_type?: string;
    occurred_at?: string;
    payload?: {
      call_control_id?: string;
      call_leg_id?: string;
      call_session_id?: string;
      connection_id?: string;
      from?: string;
      to?: string;
      direction?: "incoming" | "outgoing" | string;
      state?: string;
      start_time?: string;
      end_time?: string;
      hangup_cause?: string;
      hangup_source?: string;
      digit?: string;
      client_state?: string;
      [key: string]: unknown;
    };
    record_type?: string;
  };
};

type TelnyxActionResponse = {
  data?: Record<string, unknown>;
  errors?: unknown;
};

function cleanPhone(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizePhoneForCompare(value: unknown) {
  if (typeof value !== "string") return "";

  let clean = value.trim().replace(/[^\d+]/g, "");

  if (!clean) return "";

  clean = clean.replace(/\+/g, (match, offset) => (offset === 0 ? match : ""));

  if (clean.startsWith("00")) {
    clean = `+${clean.slice(2)}`;
  }

  if (clean.startsWith("+")) return clean;

  if (clean.startsWith("972")) return `+${clean}`;

  if (clean.startsWith("0") && clean.length >= 8) {
    return `+972${clean.slice(1)}`;
  }

  if (clean.length === 9 && clean.startsWith("5")) {
    return `+972${clean}`;
  }

  if (clean.length === 8 && /^[23489]/.test(clean)) {
    return `+972${clean}`;
  }

  return clean;
}

function getTelnyxApiKey() {
  return process.env.TELNYX_API_KEY || "";
}

function getSystemPhoneNumber() {
  return normalizePhoneForCompare(
    process.env.TELNYX_FROM_NUMBER || "+97283761556"
  );
}

/**
 * בגלל שב־Telnyx לפעמים direction חוזר ריק,
 * אנחנו מזהים שיחה נכנסת גם לפי זה שהיעד הוא המספר שלנו.
 */
function isInboundCall(params: {
  direction: string;
  from: string;
  to: string;
}) {
  const systemNumber = getSystemPhoneNumber();

  const fromNormalized = normalizePhoneForCompare(params.from);
  const toNormalized = normalizePhoneForCompare(params.to);

  if (params.direction === "incoming") return true;

  return Boolean(
    systemNumber &&
      toNormalized &&
      toNormalized === systemNumber &&
      fromNormalized !== systemNumber
  );
}

async function telnyxCallAction(
  callControlId: string,
  action: "answer" | "speak" | "hangup",
  body: Record<string, unknown> = {}
) {
  const apiKey = getTelnyxApiKey();

  if (!apiKey) {
    console.warn(`TELNYX_API_KEY is missing. Could not run action: ${action}`);
    return {
      ok: false,
      status: 500,
      data: { error: "TELNYX_API_KEY_MISSING" },
    };
  }

  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId
    )}/actions/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json().catch(() => null)) as TelnyxActionResponse | null;

  if (!res.ok) {
    console.error(`TELNYX ${action.toUpperCase()} FAILED:`, {
      status: res.status,
      data,
    });

    return {
      ok: false,
      status: res.status,
      data,
    };
  }

  console.log(`TELNYX ${action.toUpperCase()} SUCCESS:`, data);

  return {
    ok: true,
    status: res.status,
    data,
  };
}

async function answerIncomingCall(callControlId: string) {
  return telnyxCallAction(callControlId, "answer", {});
}

async function speakToCall(callControlId: string, text: string) {
  /**
   * שלב בדיקה:
   * משמיע הודעה למתקשר אחרי שהשיחה נענתה.
   * בהמשך נחליף/נוסיף כאן ניתוב לנציג פנוי.
   */
  return telnyxCallAction(callControlId, "speak", {
    payload: text,

    /**
     * אם Telnyx לא אוהבת he-IL בחשבון שלך,
     * תראי שגיאה בלוגים ואז נחליף ל־en-US זמנית.
     */
    language: "he-IL",
    voice: "female",
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Telnyx voice webhook is alive",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelnyxVoiceEvent;

    const event = body?.data;
    const eventType = event?.event_type || "";
    const payload = event?.payload || {};

    const callControlId = payload.call_control_id || "";
    const callLegId = payload.call_leg_id || "";
    const callSessionId = payload.call_session_id || "";
    const connectionId = payload.connection_id || "";
    const from = cleanPhone(payload.from);
    const to = cleanPhone(payload.to);
    const direction = String(payload.direction || "");

    const inbound = isInboundCall({
      direction,
      from,
      to,
    });

    console.log("TELNYX VOICE WEBHOOK:", {
      eventId: event?.id,
      eventType,
      recordType: event?.record_type,
      callControlId,
      callLegId,
      callSessionId,
      connectionId,
      from,
      to,
      direction,
      inbound,
      occurredAt: event?.occurred_at,
    });

    switch (eventType) {
      case "call.initiated": {
        console.log("CALL INITIATED:", {
          from,
          to,
          direction,
          inbound,
          callControlId,
        });

        /**
         * שיחה נכנסת למספר שלנו:
         * עונים אוטומטית כדי שהשיחה תיכנס למערכת.
         */
        if (inbound && callControlId) {
          await answerIncomingCall(callControlId);
        }

        break;
      }

      case "call.answered": {
        console.log("CALL ANSWERED:", {
          from,
          to,
          direction,
          inbound,
          callControlId,
        });

        /**
         * אחרי שהשיחה הנכנסת נענתה,
         * נשמיע הודעת בדיקה כדי שלא יהיה שקט.
         *
         * חשוב:
         * לא משמיעים את זה בשיחות יוצאות,
         * כדי שלקוח שמקבל שיחה מהסופטפון לא ישמע הודעת מרכזייה.
         */
        if (inbound && callControlId) {
          await speakToCall(
            callControlId,
            "שלום, הגעתם לאינוויסטימו. מיד נחבר אתכם לנציג."
          );
        }

        break;
      }

      case "call.speak.started": {
        console.log("CALL SPEAK STARTED:", {
          from,
          to,
          callControlId,
        });

        break;
      }

      case "call.speak.ended": {
        console.log("CALL SPEAK ENDED:", {
          from,
          to,
          callControlId,
        });

        /**
         * כרגע אחרי ההודעה לא עושים ניתוב.
         * בשלב הבא נוסיף כאן:
         * חיפוש נציג פנוי → הצגת שיחה בדשבורד → חיבור לנציג.
         */
        break;
      }

      case "call.hangup": {
        console.log("CALL HANGUP:", {
          from,
          to,
          direction,
          inbound,
          callControlId,
          hangupCause: payload.hangup_cause,
          hangupSource: payload.hangup_source,
        });

        break;
      }

      case "call.bridged": {
        console.log("CALL BRIDGED:", {
          from,
          to,
          direction,
          inbound,
          callControlId,
        });

        break;
      }

      case "call.dtmf.received": {
        console.log("DTMF RECEIVED:", {
          digit: payload.digit,
          callControlId,
        });

        break;
      }

      default: {
        console.log("UNHANDLED TELNYX EVENT:", {
          eventType,
          payload,
        });

        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TELNYX VOICE WEBHOOK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "TELNYX_VOICE_WEBHOOK_FAILED",
      },
      { status: 500 }
    );
  }
}
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
      direction?: "incoming" | "outgoing";
      state?: string;
      start_time?: string;
      end_time?: string;
      hangup_cause?: string;
      hangup_source?: string;
      [key: string]: unknown;
    };
    record_type?: string;
  };
};

function cleanPhone(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function answerIncomingCall(callControlId: string) {
  const apiKey = process.env.TELNYX_API_KEY;

  if (!apiKey) {
    console.warn("TELNYX_API_KEY is missing. Incoming call was not answered.");
    return;
  }

  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${encodeURIComponent(
      callControlId
    )}/actions/answer`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("TELNYX ANSWER CALL FAILED:", {
      status: res.status,
      data,
    });
    return;
  }

  console.log("TELNYX CALL ANSWERED:", data);
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
    const from = cleanPhone(payload.from);
    const to = cleanPhone(payload.to);
    const direction = payload.direction || "";

    console.log("TELNYX VOICE WEBHOOK:", {
      eventType,
      callControlId,
      callLegId,
      callSessionId,
      from,
      to,
      direction,
      occurredAt: event?.occurred_at,
    });

    switch (eventType) {
      case "call.initiated": {
        console.log("CALL INITIATED:", {
          from,
          to,
          direction,
          callControlId,
        });

        /**
         * שיחה נכנסת:
         * כאן אפשר לענות אוטומטית כדי שהשיחה תיכנס למערכת.
         * בהמשך נחבר את זה לסופטפון ולסטטוס של העובדים.
         */
        if (direction === "incoming" && callControlId) {
          await answerIncomingCall(callControlId);
        }

        break;
      }

      case "call.answered": {
        console.log("CALL ANSWERED:", {
          from,
          to,
          direction,
          callControlId,
        });

        break;
      }

      case "call.hangup": {
        console.log("CALL HANGUP:", {
          from,
          to,
          direction,
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
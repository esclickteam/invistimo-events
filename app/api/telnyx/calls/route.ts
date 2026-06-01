import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateTelnyxCallRequest = {
  to?: string;
  from?: string;
  agentId?: string;
  clientState?: Record<string, unknown>;
};

type TelnyxCreateCallResponse = {
  data?: {
    call_control_id?: string;
    call_leg_id?: string;
    call_session_id?: string;
    connection_id?: string;
    from?: string;
    to?: string;
    [key: string]: unknown;
  };
  errors?: unknown;
};

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  );
}

function normalizePhoneNumber(value: unknown) {
  if (typeof value !== "string") return "";

  let clean = value.trim();

  // מסיר רווחים, מקפים, סוגריים וכו׳ — משאיר רק ספרות ופלוס
  clean = clean.replace(/[^\d+]/g, "");

  if (!clean) return "";

  // אם יש כמה פלוסים בטעות — משאיר רק אחד בהתחלה
  clean = clean.replace(/\+/g, (match, offset) => (offset === 0 ? match : ""));

  // 00972501234567 -> +972501234567
  if (clean.startsWith("00")) {
    clean = `+${clean.slice(2)}`;
  }

  // כבר בפורמט בינלאומי: +972501234567
  if (clean.startsWith("+")) {
    return clean;
  }

  // ישראל בלי פלוס: 972501234567 -> +972501234567
  if (clean.startsWith("972")) {
    return `+${clean}`;
  }

  // ישראל רגיל עם 0 בהתחלה:
  // 0501234567 -> +972501234567
  // 031234567 -> +97231234567
  // 083761556 -> +97283761556
  if (clean.startsWith("0") && clean.length >= 8) {
    return `+972${clean.slice(1)}`;
  }

  // נייד ישראלי בלי 0:
  // 501234567 -> +972501234567
  // 521234567 -> +972521234567
  if (clean.length === 9 && clean.startsWith("5")) {
    return `+972${clean}`;
  }

  // מספר נייח ישראלי בלי 0:
  // 31234567 -> +97231234567
  // 83761556 -> +97283761556
  if (clean.length === 8 && /^[23489]/.test(clean)) {
    return `+972${clean}`;
  }

  // fallback — מחזיר כמו שהוא, כדי לא לשבור חיוג בינלאומי אחר
  return clean;
}

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL;

  if (envUrl) {
    return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  }

  return req.nextUrl.origin;
}

function encodeClientState(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Telnyx outbound calls endpoint is alive",
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.TELNYX_API_KEY;
    const connectionId = process.env.TELNYX_CONNECTION_ID;
    const defaultFrom = process.env.TELNYX_FROM_NUMBER || "+97283761556";

    if (!apiKey) {
      return jsonError("TELNYX_API_KEY is missing", 500);
    }

    if (!connectionId) {
      return jsonError("TELNYX_CONNECTION_ID is missing", 500);
    }

    const body = (await req.json().catch(() => ({}))) as CreateTelnyxCallRequest;

    const originalTo = typeof body.to === "string" ? body.to : "";
    const originalFrom =
      typeof body.from === "string" && body.from.trim()
        ? body.from
        : defaultFrom;

    const to = normalizePhoneNumber(originalTo);
    const from = normalizePhoneNumber(originalFrom);

    if (!to) {
      return jsonError("Missing destination phone number: to", 400, {
        receivedTo: body.to || null,
      });
    }

    if (!from) {
      return jsonError("Missing caller ID phone number: from", 400, {
        receivedFrom: body.from || null,
        defaultFrom,
      });
    }

    const baseUrl = getBaseUrl(req);
    const webhookUrl =
      process.env.TELNYX_VOICE_WEBHOOK_URL ||
      `${baseUrl}/api/telnyx/voice/webhook`;

    const clientState = encodeClientState({
      source: "invistimo-softphone",
      agentId: body.agentId || null,
      requestedAt: new Date().toISOString(),
      originalTo,
      originalFrom,
      normalizedTo: to,
      normalizedFrom: from,
      ...(body.clientState || {}),
    });

    const telnyxPayload = {
      connection_id: connectionId,
      to,
      from,
      webhook_url: webhookUrl,
      webhook_url_method: "POST",
      client_state: clientState,
    };

    console.log("TELNYX CREATE OUTBOUND CALL REQUEST:", {
      connectionId,
      originalTo,
      originalFrom,
      normalizedTo: to,
      normalizedFrom: from,
      webhookUrl,
    });

    const telnyxRes = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(telnyxPayload),
    });

    const telnyxData =
      (await telnyxRes.json().catch(() => null)) as TelnyxCreateCallResponse | null;

    if (!telnyxRes.ok) {
      console.error("TELNYX CREATE OUTBOUND CALL FAILED:", {
        status: telnyxRes.status,
        originalTo,
        originalFrom,
        normalizedTo: to,
        normalizedFrom: from,
        data: telnyxData,
      });

      return jsonError(
        "TELNYX_CREATE_OUTBOUND_CALL_FAILED",
        telnyxRes.status,
        {
          originalTo,
          originalFrom,
          normalizedTo: to,
          normalizedFrom: from,
          telnyx: telnyxData,
        }
      );
    }

    console.log("TELNYX CREATE OUTBOUND CALL SUCCESS:", {
      callControlId: telnyxData?.data?.call_control_id || null,
      callLegId: telnyxData?.data?.call_leg_id || null,
      callSessionId: telnyxData?.data?.call_session_id || null,
      to,
      from,
    });

    return NextResponse.json({
      success: true,
      call: {
        callControlId: telnyxData?.data?.call_control_id || null,
        callLegId: telnyxData?.data?.call_leg_id || null,
        callSessionId: telnyxData?.data?.call_session_id || null,
        connectionId: telnyxData?.data?.connection_id || connectionId,
        from,
        to,
        originalTo,
        originalFrom,
      },
      telnyx: telnyxData,
    });
  } catch (error) {
    console.error("TELNYX OUTBOUND CALL ROUTE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "TELNYX_OUTBOUND_CALL_ROUTE_FAILED",
      },
      { status: 500 }
    );
  }
}
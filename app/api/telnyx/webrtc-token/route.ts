import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebrtcCredentialsResponse = {
  success: true;
  authType: "credentials";
  login: string;
  username: string;
  password: string;
  connectionId: string;
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

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Telnyx WebRTC auth endpoint is alive",
  });
}

export async function POST(req: NextRequest) {
  try {
    const username = process.env.TELNYX_WEBRTC_USERNAME || "";
    const password = process.env.TELNYX_WEBRTC_PASSWORD || "";
    const connectionId = process.env.TELNYX_WEBRTC_CONNECTION_ID || "";

    if (!username) {
      return jsonError("TELNYX_WEBRTC_USERNAME is missing", 500);
    }

    if (!password) {
      return jsonError("TELNYX_WEBRTC_PASSWORD is missing", 500);
    }

    if (!connectionId) {
      return jsonError("TELNYX_WEBRTC_CONNECTION_ID is missing", 500);
    }

    const body = await req.json().catch(() => ({}));

    console.log("TELNYX WEBRTC AUTH REQUEST:", {
      authType: "credentials",
      username,
      connectionId,
      agentId: body?.agentId || null,
      requestedAt: new Date().toISOString(),
    });

    const response: WebrtcCredentialsResponse = {
      success: true,
      authType: "credentials",
      login: username,
      username,
      password,
      connectionId,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("TELNYX WEBRTC AUTH ROUTE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "TELNYX_WEBRTC_AUTH_ROUTE_FAILED",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { presetContent } from "@/lib/invitationStudio/content";
import { freezeSnapshot } from "@/lib/invitationStudio/render";
import { getStudioTemplate } from "@/lib/invitationStudio/templates";
import { bridgeDemoRequest } from "@/lib/demo/interactive/bridge";
import {
  commitDemoSession,
  readDemoSession,
} from "@/lib/demo/interactive/sessionCookie";
import { getSession } from "@/lib/demo/interactive/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await readDemoSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "סשן הדמו לא פעיל" },
      { status: 404 }
    );
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const result = bridgeDemoRequest(
    session,
    "GET",
    `/api/invite/demo-share?token=${encodeURIComponent(token)}`,
    null
  );
  await commitDemoSession(getSession(session.id));
  const json = result.json as { invitation?: Record<string, unknown> };
  const template = getStudioTemplate("wedding-arch-luxury");
  if (json?.invitation && template) {
    json.invitation = {
      ...json.invitation,
      studioDesign: {
        designId: "demo-studio",
        templateId: template.id,
        snapshot: freezeSnapshot(template, {
          personalGreeting: true,
          content: presetContent("wedding", {
            hostNames: "מאיה ואיתי",
            eventType: "החתונה שלנו",
            wording: "נשמח לחגוג איתכם",
            venueName: "גן ורדים",
            venueAddress: "הרצליה",
            receptionTime: "קבלת פנים 19:30",
            ceremonyTime: "חופה 20:30",
            gregorianDate: "יום חמישי, 12 בנובמבר 2026",
            hebrewDate: "ב׳ בכסלו תשפ״ז",
            guestGreeting: "{name}, שמרנו לכם מקום",
          }),
        }),
      },
    };
  }
  return NextResponse.json(json, { status: result.status });
}

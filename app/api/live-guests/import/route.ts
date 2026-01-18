import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId");

  console.log("🟢 API POST /live-guests/import");
  console.log("🟢 invitationId:", invitationId);

  if (!invitationId) {
    return NextResponse.json(
      { success: false, error: "Missing invitationId" },
      { status: 400 }
    );
  }

  // כרגע מחזירים דאטה דמה – רק כדי לוודא שהחיבור עובד
  return NextResponse.json({
    success: true,
    guests: [],
    stats: {
      total: 0,
      arrived: 0,
      notArrived: 0,
      cancelled: 0,
    },
  });
}

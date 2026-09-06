import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import WeddingChallengeGuest from "@/models/WeddingChallengeGuest";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { loadEventChallengeContext } from "@/lib/weddingChallenges/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const eventId = String(new URL(req.url).searchParams.get("eventId") || "").trim();
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  await db();
  const context = await loadEventChallengeContext(eventId);
  if (!context) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const rows = await WeddingChallengeGuest.find({ eventId })
    .sort({ giveawayEntries: -1, completedCount: -1 })
    .lean();
  const guests = await InvitationGuest.find({
    _id: { $in: rows.map((row) => row.guestId) },
  })
    .select("name phone tableName tableNumber")
    .lean();
  const byId = new Map(guests.map((guest) => [String(guest._id), guest]));

  const lines = [
    "name,phone,table,completed,entries,winner",
    ...rows.map((row) => {
      const guest = byId.get(String(row.guestId));
      const isWinner = String(context.settings.giveaway.winnerGuestId || "") === String(row.guestId);
      const table = guest?.tableName || guest?.tableNumber || "";
      return [
        csv(guest?.name),
        csv(guest?.phone),
        csv(table),
        Number(row.completedCount || 0),
        Number(row.giveawayEntries || 0),
        isWinner ? "yes" : "",
      ].join(",");
    }),
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wedding-challenges-giveaway.csv"`,
    },
  });
}

function csv(value: unknown) {
  const text = String(value || "").replace(/"/g, '""');
  return `"${text}"`;
}

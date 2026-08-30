import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { parseCoord } from "@/lib/navigationLinks";
import { searchWazePlaces } from "@/lib/resolveWazePlace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  const lat = parseCoord(req.nextUrl.searchParams.get("lat"));
  const lng = parseCoord(req.nextUrl.searchParams.get("lng"));

  if (q.length < 2) {
    return NextResponse.json({ success: true, places: [] });
  }

  const places = await searchWazePlaces(q, { lat, lng });
  return NextResponse.json({ success: true, places });
}

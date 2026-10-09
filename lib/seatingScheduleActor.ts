import type { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import type { SeatingScheduleActor } from "@/lib/seatingSchedule";
import User from "@/models/User";

export async function resolveSeatingScheduleActor(
  req: NextRequest,
): Promise<SeatingScheduleActor> {
  try {
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) return { userId: "", name: "" };

    const user = await User.findById(auth.userId).select("name").lean();
    const name = String((user as { name?: string } | null)?.name || "").trim();

    return {
      userId: String(auth.userId),
      name,
    };
  } catch {
    return { userId: "", name: "" };
  }
}

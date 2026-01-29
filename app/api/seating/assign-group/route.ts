// app/api/seating/assign-group/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import Group from "@/models/Group";

export async function PATCH(req: Request) {
  await dbConnect();

  const { eventId, tableId, groupId } = await req.json();

  if (!eventId || !tableId || !groupId) {
    return NextResponse.json(
      { success: false, error: "Missing params" },
      { status: 400 }
    );
  }

  // 1️⃣ מביאים קבוצה
  const group = await Group.findById(groupId).lean();
  if (!group) {
    return NextResponse.json(
      { success: false, error: "Group not found" },
      { status: 404 }
    );
  }

  // 2️⃣ מעדכנים snapshot בשולחן
  await SeatingTable.updateOne(
    { eventId, "tables.id": tableId },
    {
      $set: {
        "tables.$.group": {
          id: group._id,
          name: group.name,
          expectedCount: Number(group.expectedCount || 0),
        },
      },
    }
  );

  // 3️⃣ מעדכנים את הקבוצה עצמה
  await Group.updateOne(
    { _id: groupId },
    {
      $set: {
        tableId,
        isSeated: true,
      },
    }
  );

  return NextResponse.json({ success: true });
}

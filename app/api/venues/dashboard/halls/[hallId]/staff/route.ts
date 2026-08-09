import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VenueEmployee from "@/models/VenueEmployee";
import VenueStaffSchedule from "@/models/VenueStaffSchedule";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function serializeEmployee(e: any) {
  return {
    id: String(e._id),
    _id: String(e._id),
    fullName: e.fullName || "",
    name: e.fullName || "",
    phone: e.phone || "",
    email: e.email || "",
    jobTitle: e.jobTitle || "",
    role: e.jobTitle || "",
    status: e.status || "active",
    userId: e.userId ? String(e.userId) : null,
    notes: e.notes || "",
    initials:
      String(e.fullName || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0])
        .join("") || "?",
  };
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "staff.view");
    if (error || !ctx) return error!;

    const url = new URL(req.url);
    const weekStart = cleanString(url.searchParams.get("weekStart"));

    const employees = await VenueEmployee.find({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
    })
      .sort({ fullName: 1 })
      .lean();

    let schedule: any = null;
    if (weekStart) {
      schedule = await VenueStaffSchedule.findOne({
        venueId: ctx.venueId,
        weekStart,
      }).lean();
    }

    return NextResponse.json({
      success: true,
      venueId: ctx.venueId,
      employees: employees.map(serializeEmployee),
      schedule: schedule
        ? {
            weekStart: schedule.weekStart,
            shifts: schedule.shifts || [],
            absences: schedule.absences || [],
            updatedAt: schedule.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("GET venue staff failed:", error);
    return NextResponse.json(
      { success: false, message: "טעינת צוות נכשלה" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "staff.manage"
    );
    if (error || !ctx) return error!;

    const body = await req.json();
    const fullName = cleanString(body.fullName || body.name);
    if (!fullName) {
      return NextResponse.json(
        { success: false, message: "חובה להזין שם עובד" },
        { status: 400 }
      );
    }

    const employee = await VenueEmployee.create({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      fullName,
      phone: cleanString(body.phone),
      email: cleanString(body.email).toLowerCase(),
      jobTitle: cleanString(body.jobTitle || body.role),
      status: body.status === "inactive" ? "inactive" : "active",
      notes: cleanString(body.notes),
      createdBy: ctx.auth.userId,
    });

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "staff.create",
      targetType: "VenueEmployee",
      targetId: String(employee._id),
    });

    return NextResponse.json({
      success: true,
      employee: serializeEmployee(employee),
    });
  } catch (error) {
    console.error("POST venue staff failed:", error);
    return NextResponse.json(
      { success: false, message: "יצירת עובד נכשלה" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "staff.manage"
    );
    if (error || !ctx) return error!;

    const body = await req.json();
    const action = cleanString(body.action || "updateEmployee");

    if (action === "saveSchedule") {
      const weekStart = cleanString(body.weekStart);
      if (!weekStart) {
        return NextResponse.json(
          { success: false, message: "חסר weekStart" },
          { status: 400 }
        );
      }

      const schedule = await VenueStaffSchedule.findOneAndUpdate(
        { venueId: ctx.venueId, weekStart },
        {
          $set: {
            ownerId: ctx.ownerId,
            shifts: Array.isArray(body.shifts) ? body.shifts : [],
            absences: Array.isArray(body.absences) ? body.absences : [],
            updatedBy: ctx.auth.userId,
          },
        },
        { upsert: true, new: true }
      );

      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: ctx.auth.userId,
        action: "staff.saveSchedule",
        targetType: "VenueStaffSchedule",
        targetId: String(schedule._id),
        meta: { weekStart },
      });

      return NextResponse.json({
        success: true,
        message: "השיבוץ נשמר",
        schedule: {
          weekStart: schedule.weekStart,
          shifts: schedule.shifts,
          absences: schedule.absences,
        },
      });
    }

    const employeeId = cleanString(body.employeeId || body.id);
    if (!employeeId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה עובד" },
        { status: 400 }
      );
    }

    const patch: Record<string, any> = {};
    if ("fullName" in body || "name" in body) {
      patch.fullName = cleanString(body.fullName || body.name);
    }
    if ("phone" in body) patch.phone = cleanString(body.phone);
    if ("email" in body) patch.email = cleanString(body.email).toLowerCase();
    if ("jobTitle" in body || "role" in body) {
      patch.jobTitle = cleanString(body.jobTitle || body.role);
    }
    if ("notes" in body) patch.notes = cleanString(body.notes);
    if (body.status === "active" || body.status === "inactive") {
      patch.status = body.status;
    }

    const employee = await VenueEmployee.findOneAndUpdate(
      {
        _id: employeeId,
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
      },
      { $set: patch },
      { new: true }
    );

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "עובד לא נמצא" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: serializeEmployee(employee),
    });
  } catch (error) {
    console.error("PUT venue staff failed:", error);
    return NextResponse.json(
      { success: false, message: "שמירת צוות נכשלה" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "staff.manage"
    );
    if (error || !ctx) return error!;

    const url = new URL(req.url);
    const employeeId = cleanString(url.searchParams.get("employeeId"));
    if (!employeeId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה עובד" },
        { status: 400 }
      );
    }

    const deleted = await VenueEmployee.findOneAndDelete({
      _id: employeeId,
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "עובד לא נמצא" },
        { status: 404 }
      );
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "staff.delete",
      targetType: "VenueEmployee",
      targetId: employeeId,
    });

    return NextResponse.json({ success: true, deletedEmployeeId: employeeId });
  } catch (error) {
    console.error("DELETE venue staff failed:", error);
    return NextResponse.json(
      { success: false, message: "מחיקת עובד נכשלה" },
      { status: 500 }
    );
  }
}

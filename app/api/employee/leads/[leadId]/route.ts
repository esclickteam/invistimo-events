import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import CustomerFile from "@/models/CustomerFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

void User;

type AuthUser = {
  id?: string;
  _id?: string;
  userId?: string;
  role?: string;
  staffType?: string;
  businessId?: string;
  email?: string;
  name?: string;
};

const ALLOWED_LEAD_STATUSES = [
  "new",
  "contacted",
  "quote_sent",
  "converted",
  "lost",
] as const;

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeRole(value: unknown) {
  return cleanString(value).toLowerCase();
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function getCookieValue(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  names: string[]
) {
  for (const name of names) {
    const value = cookieStore.get(name)?.value;

    if (value) {
      return value;
    }
  }

  return "";
}

function getUserIdFromAuth(user: AuthUser | null) {
  const id = cleanString(user?.id || user?._id || user?.userId);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return "";
  }

  return id;
}

async function getAuthUser(): Promise<AuthUser | null> {
  const secret = getJwtSecret();

  if (!secret) {
    console.error("EMPLOYEE LEAD AUTH ERROR: missing JWT secret");
    return null;
  }

  const cookieStore = await cookies();

  const token = getCookieValue(cookieStore, [
    "token",
    "auth-token",
    "authToken",
    "session",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ]);

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthUser;
    return decoded || null;
  } catch (error) {
    console.error("EMPLOYEE LEAD AUTH VERIFY ERROR:", error);
    return null;
  }
}

function isAdmin(user: AuthUser | null) {
  return normalizeRole(user?.role) === "admin";
}

function isEmployeeAllowed(user: AuthUser | null) {
  const role = normalizeRole(user?.role);
  const staffType = normalizeRole(user?.staffType);

  return (
    role === "staff" ||
    role === "employee" ||
    role === "admin" ||
    Boolean(staffType)
  );
}

function isLeadCustomer(customer: any) {
  return (
    cleanString(customer?.status) === "lead" ||
    cleanString(customer?.leadSource) !== "" ||
    cleanString(customer?.leadProvider) !== "" ||
    cleanString(customer?.facebookLeadId) !== "" ||
    cleanString(customer?.source) === "facebook_lead_make"
  );
}

function isAssignedToEmployee(customer: any, employeeId: string) {
  const assignedStaffIds = Array.isArray(customer?.assignedStaffIds)
    ? customer.assignedStaffIds
    : [];

  return assignedStaffIds.some((staffId: unknown) => {
    const id =
      typeof staffId === "object" && staffId
        ? cleanString((staffId as any)._id || (staffId as any).id)
        : cleanString(staffId);

    return id === employeeId;
  });
}

async function getLeadForEmployee(leadId: string, authUser: AuthUser | null) {
  if (!authUser || !isEmployeeAllowed(authUser)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "אין הרשאה לצפייה בליד",
        },
        { status: 401 }
      ),
      lead: null,
      employeeId: "",
    };
  }

  const employeeId = getUserIdFromAuth(authUser);

  if (!employeeId) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "INVALID_EMPLOYEE",
          message: "משתמש עובד לא תקין",
        },
        { status: 400 }
      ),
      lead: null,
      employeeId: "",
    };
  }

  const leadObjectId = toObjectId(leadId);

  if (!leadObjectId) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "INVALID_LEAD_ID",
          message: "מזהה ליד לא תקין",
        },
        { status: 400 }
      ),
      lead: null,
      employeeId,
    };
  }

  const lead = await CustomerFile.findById(leadObjectId)
    .populate("assignedStaffIds", "_id name email role staffType")
    .lean();

  if (!lead) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "LEAD_NOT_FOUND",
          message: "הליד לא נמצא",
        },
        { status: 404 }
      ),
      lead: null,
      employeeId,
    };
  }

  if (!isLeadCustomer(lead)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "NOT_A_LEAD",
          message: "התיק הזה אינו מוגדר כליד",
        },
        { status: 400 }
      ),
      lead: null,
      employeeId,
    };
  }

  const allowed = isAdmin(authUser) || isAssignedToEmployee(lead, employeeId);

  if (!allowed) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "הליד לא משויך לעובד הזה",
        },
        { status: 403 }
      ),
      lead: null,
      employeeId,
    };
  }

  return {
    errorResponse: null,
    lead,
    employeeId,
  };
}

function getCustomerStatusByLeadStatus(leadStatus: string) {
  switch (leadStatus) {
    case "quote_sent":
      return "quote_sent";
    case "converted":
      return "active";
    case "lost":
      return "cancelled";
    default:
      return "lead";
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();
    const { leadId } = await context.params;

    const { errorResponse, lead, employeeId } = await getLeadForEmployee(
      leadId,
      authUser
    );

    if (errorResponse) {
      return errorResponse;
    }

    return NextResponse.json(
      {
        success: true,
        employeeId,
        lead,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET EMPLOYEE LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בטעינת הליד",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();
    const { leadId } = await context.params;

    const { errorResponse } = await getLeadForEmployee(leadId, authUser);

    if (errorResponse) {
      return errorResponse;
    }

    const leadObjectId = toObjectId(leadId);

    if (!leadObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_LEAD_ID",
          message: "מזהה ליד לא תקין",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);

    const nextLeadStatus = cleanString(body?.leadStatus);
    const notes = cleanString(body?.notes);

    const update: Record<string, unknown> = {};

    if (nextLeadStatus) {
      if (!ALLOWED_LEAD_STATUSES.includes(nextLeadStatus as any)) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_LEAD_STATUS",
            message: "סטטוס ליד לא תקין",
          },
          { status: 400 }
        );
      }

      update.leadStatus = nextLeadStatus;
      update.status = getCustomerStatusByLeadStatus(nextLeadStatus);
    }

    if (typeof body?.notes !== "undefined") {
      update.notes = notes;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "EMPTY_UPDATE",
          message: "לא נשלחו נתונים לעדכון",
        },
        { status: 400 }
      );
    }

    const updatedLead = await CustomerFile.findByIdAndUpdate(
      leadObjectId,
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("assignedStaffIds", "_id name email role staffType")
      .lean();

    if (!updatedLead) {
      return NextResponse.json(
        {
          success: false,
          error: "LEAD_NOT_FOUND",
          message: "הליד לא נמצא",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "הליד עודכן בהצלחה",
        lead: updatedLead,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("PATCH EMPLOYEE LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בעדכון הליד",
      },
      { status: 500 }
    );
  }
}
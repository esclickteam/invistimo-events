import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import CustomerFile from "@/models/CustomerFile";
import CustomerLeadMessage from "@/models/CustomerLeadMessage";

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

    if (value) return value;
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
    console.error("EMPLOYEE LEAD MESSAGES STREAM AUTH ERROR: missing JWT secret");
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

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secret) as AuthUser;
    return decoded || null;
  } catch (error) {
    console.error("EMPLOYEE LEAD MESSAGES STREAM AUTH VERIFY ERROR:", error);
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
    cleanString(customer?.source) === "facebook_lead_make" ||
    cleanString(customer?.source) === "whatsapp" ||
    cleanString(customer?.source) === "whatsapp_inbox"
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
          message: "אין הרשאה לצפייה בהודעות הליד",
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
    .populate({
      path: "assignedStaffIds",
      model: User,
      select: "_id name email role staffType",
    })
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

function sseMessage(eventName: string, data: unknown) {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseComment(comment: string) {
  return `: ${comment}\n\n`;
}

async function getHydratedMessage(messageId: unknown) {
  const objectId = toObjectId(messageId);

  if (!objectId) return null;

  return CustomerLeadMessage.findById(objectId)
    .populate({
      path: "staffId",
      model: User,
      select: "_id name email role staffType",
    })
    .lean();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    await db();

    const authUser = await getAuthUser();
    const { leadId } = await context.params;

    const { errorResponse } = await getLeadForEmployee(leadId, authUser);

    if (errorResponse) return errorResponse;

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

    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let changeStream: any = null;
    let closed = false;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (eventName: string, data: unknown) => {
          if (closed) return;

          try {
            controller.enqueue(encoder.encode(sseMessage(eventName, data)));
          } catch {
            closed = true;
          }
        };

        const sendComment = (comment: string) => {
          if (closed) return;

          try {
            controller.enqueue(encoder.encode(sseComment(comment)));
          } catch {
            closed = true;
          }
        };

        const cleanup = async () => {
          if (closed) return;

          closed = true;

          if (heartbeat) {
            clearInterval(heartbeat);
            heartbeat = null;
          }

          if (changeStream) {
            try {
              await changeStream.close();
            } catch {
              // ignore close errors
            }
            changeStream = null;
          }

          try {
            controller.close();
          } catch {
            // ignore close errors
          }
        };

        req.signal.addEventListener("abort", () => {
          void cleanup();
        });

        send("connected", {
          success: true,
          leadId,
          message: "חיבור הצ׳אט בזמן אמת פעיל",
          connectedAt: new Date().toISOString(),
        });

        heartbeat = setInterval(() => {
          sendComment(`heartbeat ${new Date().toISOString()}`);
        }, 25000);

        try {
          changeStream = CustomerLeadMessage.watch(
            [
              {
                $match: {
                  operationType: {
                    $in: ["insert", "update", "replace"],
                  },
                  "fullDocument.customerFileId": leadObjectId,
                },
              },
            ],
            {
              fullDocument: "updateLookup",
            }
          );

          changeStream.on("change", async (change: any) => {
            if (closed) return;

            try {
              const fullDocument = change?.fullDocument;

              if (!fullDocument?._id) return;

              const message = await getHydratedMessage(fullDocument._id);

              if (!message) return;

              send("message", {
                success: true,
                message,
              });
            } catch (error) {
              console.error("EMPLOYEE LEAD MESSAGE STREAM CHANGE ERROR:", error);

              send("stream_warning", {
                success: false,
                message: "התקבלה הודעה חדשה אך הייתה בעיה בטעינתה",
              });
            }
          });

          changeStream.on("error", (error: unknown) => {
            console.error("EMPLOYEE LEAD MESSAGE STREAM ERROR:", error);

            send("stream_error", {
              success: false,
              error: "CHANGE_STREAM_ERROR",
              message:
                "חיבור זמן אמת לצ׳אט נכשל. ודאי שמסד הנתונים תומך ב-MongoDB Change Streams.",
            });

            void cleanup();
          });

          changeStream.on("close", () => {
            if (closed) return;

            send("stream_closed", {
              success: false,
              message: "חיבור הצ׳אט בזמן אמת נסגר",
            });

            void cleanup();
          });
        } catch (error) {
          console.error("EMPLOYEE LEAD MESSAGE STREAM START ERROR:", error);

          send("stream_error", {
            success: false,
            error: "STREAM_START_FAILED",
            message:
              "לא ניתן לפתוח חיבור זמן אמת לצ׳אט. Change Streams דורשים MongoDB Atlas או Replica Set.",
          });

          void cleanup();
        }
      },

      async cancel() {
        closed = true;

        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }

        if (changeStream) {
          try {
            await changeStream.close();
          } catch {
            // ignore close errors
          }
          changeStream = null;
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("GET EMPLOYEE LEAD MESSAGE STREAM ROUTE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בפתיחת צ׳אט בזמן אמת",
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import Event from "@/models/Event";
import VenueMenu from "@/models/VenueMenu";
import VenueEventMenu from "@/models/VenueEventMenu";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSelectionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    "";

  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "";
  return `${proto}://${host}`;
}

function normalizeCategories(categories: any[] = []) {
  return categories.map((category, index) => {
    const dishes = Array.isArray(category?.dishes) ? category.dishes : [];

    const maxChoices = Number(category?.maxChoices);
    const minChoices = Number(category?.minChoices);

    return {
      id: String(category?.id || category?._id || `category-${index + 1}`),
      title: String(category?.title || category?.name || `קטגוריה ${index + 1}`),
      subtitle: String(category?.subtitle || ""),
      minChoices: Number.isFinite(minChoices) ? minChoices : 1,
      maxChoices: Number.isFinite(maxChoices) ? maxChoices : 1,
      eventMinChoices: Number.isFinite(minChoices) ? minChoices : 1,
      eventMaxChoices: Number.isFinite(maxChoices) ? maxChoices : 1,
      eventNote: "",
      dishes: dishes.map((dish: any, dishIndex: number) => ({
        id: String(dish?.id || dish?._id || `dish-${dishIndex + 1}`),
        name: String(dish?.name || "מנה ללא שם"),
        description: String(dish?.description || ""),
        image: String(dish?.image || ""),
        tags: Array.isArray(dish?.tags) ? dish.tags.map(String) : [],
      })),
    };
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const eventId = params.eventId;

    const eventMenu = await VenueEventMenu.findOne({
      eventId,
      venueOwnerId: auth.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!eventMenu) {
      return NextResponse.json({
        success: true,
        menu: null,
      });
    }

    const baseUrl = getBaseUrl(req);
    const selectionLink = `${baseUrl}/menus/choose/${eventMenu.selectionToken}`;

    return NextResponse.json({
      success: true,
      menu: eventMenu,
      selectionLink,
    });
  } catch (error) {
    console.error("GET event menu failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת תפריט האירוע נכשלה",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const eventId = params.eventId;
    const body = await req.json().catch(() => ({}));

    const templateId = String(body?.templateId || body?.menuId || "");

    if (!templateId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה תפריט" },
        { status: 400 }
      );
    }

    const event = await Event.findOne({
      _id: eventId,
      venueOwnerId: auth.userId,
    }).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "האירוע לא נמצא או שאין הרשאה" },
        { status: 404 }
      );
    }

    const menuTemplate = await VenueMenu.findOne({
      _id: templateId,
      venueOwnerId: auth.userId,
    }).lean();

    if (!menuTemplate) {
      return NextResponse.json(
        { success: false, message: "התפריט לא נמצא או שאין הרשאה" },
        { status: 404 }
      );
    }

    const existing = await VenueEventMenu.findOne({
      eventId,
      venueOwnerId: auth.userId,
    });

    const selectionToken = existing?.selectionToken || createSelectionToken();

    const eventMenuPayload = {
      eventId,
      hallId: String((event as any).venueHallId || (menuTemplate as any).hallId || ""),
      venueOwnerId: String(auth.userId),
      templateId: String((menuTemplate as any)._id),
      name: String((menuTemplate as any).name || "תפריט אירוע"),
      description: String((menuTemplate as any).description || ""),
      type: String((menuTemplate as any).type || ""),
      status: "pending",
      selectionToken,
      eventNote: String(body?.eventNote || ""),
      categories: normalizeCategories((menuTemplate as any).categories || []),
      selectedDishes: [],
      submittedAt: null,
    };

    const savedMenu = existing
      ? await VenueEventMenu.findByIdAndUpdate(existing._id, eventMenuPayload, {
          new: true,
          runValidators: true,
        })
      : await VenueEventMenu.create(eventMenuPayload);

    await Event.findByIdAndUpdate(eventId, {
      venueEventMenuId: savedMenu._id,
      venueEventMenuStatus: "pending",
      venueEventMenuTemplateId: (menuTemplate as any)._id,
      venueEventMenuSelectionToken: selectionToken,
    });

    const baseUrl = getBaseUrl(req);
    const selectionLink = `${baseUrl}/menus/choose/${selectionToken}`;

    return NextResponse.json({
      success: true,
      message: "התפריט נשמר לאירוע ונוצר קישור אישי",
      menu: savedMenu,
      selectionLink,
    });
  } catch (error) {
    console.error("POST event menu failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "שמירת התפריט לאירוע נכשלה",
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import Event from "@/models/Event";
import VenueMenu from "@/models/VenueMenu";
import VenueEventMenu from "@/models/VenueEventMenu";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type CategoryOverrideInput = {
  categoryId?: string;
  id?: string;
  name?: string;
  originalMinChoices?: number;
  originalMaxChoices?: number;
  eventMinChoices?: number;
  eventMaxChoices?: number;
  eventChoices?: number;
  eventNote?: string;
};

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

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createOverrideMap(overrides: CategoryOverrideInput[] = []) {
  const map = new Map<string, CategoryOverrideInput>();

  overrides.forEach((override) => {
    const id = String(override.categoryId || override.id || "");
    if (!id) return;
    map.set(id, override);
  });

  return map;
}

function normalizeCategories(
  categories: any[] = [],
  overrides: CategoryOverrideInput[] = []
) {
  const overrideMap = createOverrideMap(overrides);

  return categories.map((category, index) => {
    const categoryId = String(
      category?.id || category?._id || `category-${index + 1}`
    );

    const dishes = Array.isArray(category?.dishes)
      ? category.dishes
      : Array.isArray(category?.items)
        ? category.items
        : [];

    const override = overrideMap.get(categoryId);

    const originalMinChoices = toNumber(
      override?.originalMinChoices ?? category?.minChoices,
      1
    );

    const originalMaxChoices = toNumber(
      override?.originalMaxChoices ?? category?.maxChoices,
      1
    );

    const eventChoices = toNumber(
      override?.eventChoices ??
        override?.eventMaxChoices ??
        override?.eventMinChoices ??
        category?.maxChoices,
      originalMaxChoices
    );

    return {
      id: categoryId,
      originalCategoryId: categoryId,

      title: String(
        category?.title || category?.name || `קטגוריה ${index + 1}`
      ),
      subtitle: String(category?.subtitle || ""),

      minChoices: originalMinChoices,
      maxChoices: originalMaxChoices,

      eventMinChoices: eventChoices,
      eventMaxChoices: eventChoices,
      eventNote: String(override?.eventNote || ""),

      dishes: dishes.map((dish: any, dishIndex: number) => {
        const dishId = String(dish?.id || dish?._id || `dish-${dishIndex + 1}`);

        return {
          id: dishId,
          originalDishId: dishId,
          name: String(dish?.name || "מנה ללא שם"),
          description: String(dish?.description || ""),
          image: String(dish?.image || ""),
          tags: Array.isArray(dish?.tags) ? dish.tags.map(String) : [],
        };
      }),
    };
  });
}

function buildMenuResponse(menu: any, selectionLink: string) {
  const menuObject =
    typeof menu?.toObject === "function" ? menu.toObject() : menu || {};

  const categories = Array.isArray(menuObject.categories)
    ? menuObject.categories
    : [];

  return {
    ...menuObject,

    publicToken: menuObject.selectionToken,
    publicLink: selectionLink,
    selectionLink,

    categoryOverrides: categories.map((category: any, index: number) => {
      const categoryId = String(
        category?.id || category?._id || `category-${index + 1}`
      );

      const dishesCount = Array.isArray(category?.dishes)
        ? category.dishes.length
        : 0;

      return {
        id: categoryId,
        categoryId,
        name: String(category?.name || category?.title || `קטגוריה ${index + 1}`),

        minChoices: toNumber(category?.minChoices, 1),
        maxChoices: toNumber(category?.maxChoices, 1),

        originalMinChoices: toNumber(
          category?.originalMinChoices ?? category?.minChoices,
          1
        ),
        originalMaxChoices: toNumber(
          category?.originalMaxChoices ?? category?.maxChoices,
          1
        ),

        eventMinChoices: toNumber(
          category?.eventMinChoices ?? category?.eventMaxChoices,
          1
        ),
        eventMaxChoices: toNumber(
          category?.eventMaxChoices ?? category?.eventMinChoices,
          1
        ),

        eventNote: String(category?.eventNote || ""),
        dishesCount,
      };
    }),
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const { eventId } = await context.params;

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

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
        eventMenu: null,
        assignedMenu: null,
      });
    }

    const baseUrl = getBaseUrl(req);
    const selectionLink = `${baseUrl}/menus/choose/${eventMenu.selectionToken}`;
    const normalizedMenu = buildMenuResponse(eventMenu, selectionLink);

    return NextResponse.json({
      success: true,
      menu: normalizedMenu,
      eventMenu: normalizedMenu,
      assignedMenu: normalizedMenu,
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

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const { eventId } = await context.params;

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

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

    const categoryOverrides = Array.isArray(body?.categoryOverrides)
      ? body.categoryOverrides
      : [];

    const categories = normalizeCategories(
      (menuTemplate as any).categories || [],
      categoryOverrides
    );

    const eventMenuPayload = {
      eventId,
      hallId: String(
        body?.hallId ||
          (event as any).venueHallId ||
          (menuTemplate as any).hallId ||
          ""
      ),
      venueOwnerId: String(auth.userId),
      templateId: String((menuTemplate as any)._id),

      name: String((menuTemplate as any).name || "תפריט אירוע"),
      description: String((menuTemplate as any).description || ""),
      type: String((menuTemplate as any).type || ""),

      status: existing?.status || "pending",
      selectionToken,
      eventNote: String(body?.eventNote || ""),

      categories,
      selectedDishes: existing?.selectedDishes || [],
      submittedAt: existing?.submittedAt || null,
    };

    const savedMenu = existing
      ? await VenueEventMenu.findByIdAndUpdate(existing._id, eventMenuPayload, {
          new: true,
          runValidators: true,
        })
      : await VenueEventMenu.create(eventMenuPayload);

    if (!savedMenu) {
      return NextResponse.json(
        { success: false, message: "שמירת תפריט האירוע נכשלה" },
        { status: 500 }
      );
    }

    await Event.findByIdAndUpdate(eventId, {
      venueEventMenuId: savedMenu._id,
      venueEventMenuStatus: savedMenu.status || "pending",
      venueEventMenuTemplateId: (menuTemplate as any)._id,
      venueEventMenuSelectionToken: selectionToken,
    });

    const baseUrl = getBaseUrl(req);
    const selectionLink = `${baseUrl}/menus/choose/${selectionToken}`;
    const normalizedMenu = buildMenuResponse(savedMenu, selectionLink);

    return NextResponse.json({
      success: true,
      message: "התפריט נשמר לאירוע ונוצר קישור אישי",
      menu: normalizedMenu,
      eventMenu: normalizedMenu,
      assignedMenu: normalizedMenu,
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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const { eventId } = await context.params;

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const existing = await VenueEventMenu.findOne({
      eventId,
      venueOwnerId: auth.userId,
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "לא נמצא תפריט לאירוע הזה" },
        { status: 404 }
      );
    }

    const categoryOverrides = Array.isArray(body?.categoryOverrides)
      ? body.categoryOverrides
      : [];

    const overrideMap = createOverrideMap(categoryOverrides);

    existing.eventNote = String(body?.eventNote || "");

    existing.categories = existing.categories.map((category: any) => {
      const categoryId = String(category?.id || "");
      const override = overrideMap.get(categoryId);

      if (!override) return category;

      const eventChoices = toNumber(
        override.eventChoices ??
          override.eventMaxChoices ??
          override.eventMinChoices ??
          category.eventMaxChoices,
        category.eventMaxChoices || 1
      );

      return {
        ...category,
        eventMinChoices: eventChoices,
        eventMaxChoices: eventChoices,
        eventNote: String(override.eventNote || ""),
      };
    });

    existing.status = existing.status === "submitted" ? "updated" : existing.status;

    const savedMenu = await existing.save();

    const baseUrl = getBaseUrl(req);
    const selectionLink = `${baseUrl}/menus/choose/${savedMenu.selectionToken}`;
    const normalizedMenu = buildMenuResponse(savedMenu, selectionLink);

    await Event.findByIdAndUpdate(eventId, {
      venueEventMenuStatus: savedMenu.status || "pending",
    });

    return NextResponse.json({
      success: true,
      message: "תפריט האירוע עודכן",
      menu: normalizedMenu,
      eventMenu: normalizedMenu,
      assignedMenu: normalizedMenu,
      selectionLink,
    });
  } catch (error) {
    console.error("PATCH event menu failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "עדכון תפריט האירוע נכשל",
      },
      { status: 500 }
    );
  }
}
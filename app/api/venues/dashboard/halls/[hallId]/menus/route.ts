import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import VenueHall from "@/models/VenueHall";
import VenueMenu from "@/models/VenueMenu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

const allowedStatuses = ["active", "draft"];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDish(dish: any) {
  return {
    id: cleanString(dish?.id) || makeId("dish"),
    name: cleanString(dish?.name) || "מנה ללא שם",
    description: cleanString(dish?.description),
    image: cleanString(dish?.image),
    tags: Array.isArray(dish?.tags)
      ? dish.tags.map((tag: any) => cleanString(tag)).filter(Boolean)
      : [],
  };
}

function normalizeCategory(category: any) {
  const minChoices = Math.max(0, toNumber(category?.minChoices, 1));
  const maxChoices = Math.max(
    minChoices,
    toNumber(category?.maxChoices, minChoices || 1)
  );

  return {
    id: cleanString(category?.id) || makeId("cat"),
    title: cleanString(category?.title) || "קטגוריה ללא שם",
    subtitle: cleanString(category?.subtitle),
    minChoices,
    maxChoices,
    dishes: Array.isArray(category?.dishes)
      ? category.dishes.map(normalizeDish)
      : [],
  };
}

function normalizeCategories(categories: any) {
  if (!Array.isArray(categories)) return [];
  return categories.map(normalizeCategory);
}

function serializeMenu(menu: any) {
  return {
    id: String(menu._id),
    _id: String(menu._id),

    ownerId: String(menu.ownerId),
    hallId: menu.hallId,

    name: menu.name || "",
    description: menu.description || "",
    type: menu.type || "",
    status: menu.status || "draft",

    categories: Array.isArray(menu.categories) ? menu.categories : [],

    updatedAt: menu.updatedAt
      ? new Date(menu.updatedAt).toLocaleString("he-IL")
      : "",
    createdAt: menu.createdAt,
  };
}

async function requireAuthAndHall(req: NextRequest, hallId: string) {
  const auth = await getUserIdFromRequest(req);

  if (!auth?.userId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      ),
      auth: null,
      hall: null,
    };
  }

  const hall = await VenueHall.findOne({
    ownerId: auth.userId,
    id: hallId,
  }).lean();

  if (!hall) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "האולם לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      ),
      auth,
      hall: null,
    };
  }

  return {
    error: null,
    auth,
    hall,
  };
}

/* ======================================================
   GET /api/venues/dashboard/halls/[hallId]/menus
   שליפת כל תפריטי האולם
====================================================== */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const guard = await requireAuthAndHall(req, hallId);
    if (guard.error) return guard.error;

    const menus = await VenueMenu.find({
      ownerId: guard.auth!.userId,
      hallId,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      hall: {
        id: guard.hall!.id,
        name: guard.hall!.name,
        subtitle: guard.hall!.subtitle || "",
        capacity: guard.hall!.capacity || 0,
        status: guard.hall!.status || "active",
        image: guard.hall!.image || "",
      },
      menus: menus.map(serializeMenu),
    });
  } catch (error) {
    console.error(
      "GET /api/venues/dashboard/halls/[hallId]/menus failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "טעינת תפריטי האולם נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   POST /api/venues/dashboard/halls/[hallId]/menus
   יצירת תפריט חדש
====================================================== */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const guard = await requireAuthAndHall(req, hallId);
    if (guard.error) return guard.error;

    const body = await req.json();

    const name = cleanString(body.name);
    const description = cleanString(body.description);
    const type = cleanString(body.type);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שם תפריט",
        },
        { status: 400 }
      );
    }

    const requestedStatus = cleanString(body.status);
    const status = allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : "draft";

    const categories = normalizeCategories(body.categories);

    const menu = await VenueMenu.create({
      ownerId: guard.auth!.userId,
      hallId,

      name,
      description,
      type,
      status,

      categories,
    });

    return NextResponse.json({
      success: true,
      message: "התפריט נוצר בהצלחה",
      menu: serializeMenu(menu),
    });
  } catch (error) {
    console.error(
      "POST /api/venues/dashboard/halls/[hallId]/menus failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "יצירת תפריט נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   PUT /api/venues/dashboard/halls/[hallId]/menus
   עדכון תפריט קיים
   body חייב לכלול menuId או id
====================================================== */
export async function PUT(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const guard = await requireAuthAndHall(req, hallId);
    if (guard.error) return guard.error;

    const body = await req.json();

    const menuId = cleanString(body.menuId || body.id || body._id);

    if (!menuId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה תפריט לעדכון",
        },
        { status: 400 }
      );
    }

    const patch: Record<string, any> = {};

    if ("name" in body) {
      const name = cleanString(body.name);

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "שם תפריט לא יכול להיות ריק",
          },
          { status: 400 }
        );
      }

      patch.name = name;
    }

    if ("description" in body) {
      patch.description = cleanString(body.description);
    }

    if ("type" in body) {
      patch.type = cleanString(body.type);
    }

    if ("status" in body) {
      const requestedStatus = cleanString(body.status);
      patch.status = allowedStatuses.includes(requestedStatus)
        ? requestedStatus
        : "draft";
    }

    if ("categories" in body) {
      patch.categories = normalizeCategories(body.categories);
    }

    const menu = await VenueMenu.findOneAndUpdate(
      {
        _id: menuId,
        ownerId: guard.auth!.userId,
        hallId,
      },
      {
        $set: patch,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!menu) {
      return NextResponse.json(
        {
          success: false,
          message: "התפריט לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "התפריט נשמר בהצלחה",
      menu: serializeMenu(menu),
    });
  } catch (error) {
    console.error(
      "PUT /api/venues/dashboard/halls/[hallId]/menus failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "שמירת תפריט נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   DELETE /api/venues/dashboard/halls/[hallId]/menus?menuId=...
   מחיקת תפריט
====================================================== */
export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const guard = await requireAuthAndHall(req, hallId);
    if (guard.error) return guard.error;

    const url = new URL(req.url);
    let menuId = cleanString(url.searchParams.get("menuId"));

    if (!menuId) {
      try {
        const body = await req.json();
        menuId = cleanString(body.menuId || body.id || body._id);
      } catch {
        menuId = "";
      }
    }

    if (!menuId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה תפריט למחיקה",
        },
        { status: 400 }
      );
    }

    const deleted = await VenueMenu.findOneAndDelete({
      _id: menuId,
      ownerId: guard.auth!.userId,
      hallId,
    });

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: "התפריט לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "התפריט נמחק בהצלחה",
      deletedMenuId: menuId,
    });
  } catch (error) {
    console.error(
      "DELETE /api/venues/dashboard/halls/[hallId]/menus failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "מחיקת תפריט נכשלה",
      },
      { status: 500 }
    );
  }
}
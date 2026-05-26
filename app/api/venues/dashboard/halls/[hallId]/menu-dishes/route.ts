import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import VenueMenuDish from "@/models/VenueMenuDish";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    hallId: string;
  }>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

export async function GET(req: NextRequest, context: RouteParams) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const { hallId } = await context.params;
    const cleanHallId = cleanString(hallId);

    if (!cleanHallId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה אולם" },
        { status: 400 }
      );
    }

    const dishes = await VenueMenuDish.find({
      ownerId: auth.userId,
      hallId: cleanHallId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      dishes: dishes.map((dish: any) => ({
        id: String(dish._id),
        _id: String(dish._id),
        name: dish.name || "",
        description: dish.description || "",
        image: dish.image || "",
        tags: Array.isArray(dish.tags) ? dish.tags : [],
        createdAt: dish.createdAt,
        updatedAt: dish.updatedAt,
      })),
    });
  } catch (error) {
    console.error("GET menu-dishes failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת ספריית המנות נכשלה",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteParams) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const { hallId } = await context.params;
    const cleanHallId = cleanString(hallId);

    if (!cleanHallId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה אולם" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const name = cleanString(body?.name);
    const description = cleanString(body?.description);
    const image = cleanString(body?.image);

    if (!name) {
      return NextResponse.json(
        { success: false, message: "חובה להזין שם מנה" },
        { status: 400 }
      );
    }

    if (image && image.length > 8_000_000) {
      return NextResponse.json(
        {
          success: false,
          message: "התמונה גדולה מדי. העלי תמונה קלה יותר.",
        },
        { status: 400 }
      );
    }

    const dish = await VenueMenuDish.create({
      ownerId: auth.userId,
      hallId: cleanHallId,
      name,
      description,
      image,
      tags: [],
    });

    return NextResponse.json({
      success: true,
      dish: {
        id: String(dish._id),
        _id: String(dish._id),
        name: dish.name,
        description: dish.description,
        image: dish.image,
        tags: [],
        createdAt: dish.createdAt,
        updatedAt: dish.updatedAt,
      },
    });
  } catch (error) {
    console.error("POST menu-dishes failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "שמירת המנה נכשלה",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const { hallId } = await context.params;
    const cleanHallId = cleanString(hallId);

    const { searchParams } = new URL(req.url);
    const dishId = cleanString(searchParams.get("dishId"));

    if (!cleanHallId || !dishId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה אולם או מנה" },
        { status: 400 }
      );
    }

    await VenueMenuDish.deleteOne({
      _id: dishId,
      ownerId: auth.userId,
      hallId: cleanHallId,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE menu-dishes failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "מחיקת המנה נכשלה",
      },
      { status: 500 }
    );
  }
}
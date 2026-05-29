import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import VenueMenuDishCategory from "@/models/VenueMenuDishCategory";
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

    const categories = await VenueMenuDishCategory.find({
      ownerId: auth.userId,
      hallId: cleanHallId,
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      categories: categories.map((category: any) => ({
        id: String(category._id),
        _id: String(category._id),
        name: category.name || "",
        sortOrder: Number.isFinite(Number(category.sortOrder))
          ? Number(category.sortOrder)
          : 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
    });
  } catch (error) {
    console.error("GET menu-dish-categories failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת קטגוריות המנות נכשלה",
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

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שם קטגוריה",
        },
        { status: 400 }
      );
    }

    const exists = await VenueMenuDishCategory.findOne({
      ownerId: auth.userId,
      hallId: cleanHallId,
      name,
    }).lean();

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: "קטגוריה בשם הזה כבר קיימת",
        },
        { status: 409 }
      );
    }

    const count = await VenueMenuDishCategory.countDocuments({
      ownerId: auth.userId,
      hallId: cleanHallId,
    });

    const category = await VenueMenuDishCategory.create({
      ownerId: auth.userId,
      hallId: cleanHallId,
      name,
      sortOrder: count,
    });

    return NextResponse.json({
      success: true,
      category: {
        id: String(category._id),
        _id: String(category._id),
        name: category.name || "",
        sortOrder: Number.isFinite(Number(category.sortOrder))
          ? Number(category.sortOrder)
          : 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (error) {
    console.error("POST menu-dish-categories failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "שמירת הקטגוריה נכשלה",
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
    const categoryId = cleanString(searchParams.get("categoryId"));

    if (!cleanHallId || !categoryId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם או קטגוריה",
        },
        { status: 400 }
      );
    }

    await VenueMenuDishCategory.deleteOne({
      _id: categoryId,
      ownerId: auth.userId,
      hallId: cleanHallId,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE menu-dish-categories failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "מחיקת הקטגוריה נכשלה",
      },
      { status: 500 }
    );
  }
}
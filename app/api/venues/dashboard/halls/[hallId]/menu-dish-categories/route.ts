import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
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

function isValidMongoId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

function formatCategory(category: any) {
  return {
    id: String(category._id),
    _id: String(category._id),
    ownerId: category.ownerId ? String(category.ownerId) : "",
    hallId: String(category.hallId || ""),
    name: String(category.name || ""),
    sortOrder: Number.isFinite(Number(category.sortOrder))
      ? Number(category.sortOrder)
      : 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
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
      categories: categories.map(formatCategory),
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

    const existingCategory = await VenueMenuDishCategory.findOne({
      ownerId: auth.userId,
      hallId: cleanHallId,
      name,
    }).lean();

    if (existingCategory) {
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
      category: formatCategory(category),
    });
  } catch (error: any) {
    console.error("POST menu-dish-categories failed:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "קטגוריה בשם הזה כבר קיימת",
        },
        { status: 409 }
      );
    }

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

    if (!isValidMongoId(categoryId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה קטגוריה לא תקין",
        },
        { status: 400 }
      );
    }

    const deleted = await VenueMenuDishCategory.findOneAndDelete({
      _id: categoryId,
      ownerId: auth.userId,
      hallId: cleanHallId,
    }).lean();

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: "הקטגוריה לא נמצאה או שאין הרשאה למחוק אותה",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCategoryId: categoryId,
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
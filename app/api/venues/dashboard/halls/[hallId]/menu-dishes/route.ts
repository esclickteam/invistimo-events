import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import VenueHall from "@/models/VenueHall";
import VenueMenuDish from "@/models/VenueMenuDish";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    hallId: string;
  }>;
};

async function getAuthHall(hallId: string) {
  const auth = await getUserIdFromRequest();

  if (!auth?.userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      ),
      userId: null,
      hall: null,
    };
  }

  const hall = await VenueHall.findOne({
    _id: hallId,
    ownerId: auth.userId,
  })
    .select("_id ownerId name")
    .lean();

  if (!hall) {
    return {
      error: NextResponse.json(
        { success: false, message: "האולם לא נמצא או שאין הרשאה" },
        { status: 404 }
      ),
      userId: auth.userId,
      hall: null,
    };
  }

  return {
    error: null,
    userId: auth.userId,
    hall,
  };
}

export async function GET(_req: NextRequest, context: Params) {
  try {
    await db();

    const { hallId } = await context.params;
    const { error, hall } = await getAuthHall(hallId);

    if (error) return error;

    const dishes = await VenueMenuDish.find({
      hallId: hall!._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      dishes,
    });
  } catch (error) {
    console.error("GET menu-dishes failed:", error);
    return NextResponse.json(
      { success: false, message: "טעינת ספריית המנות נכשלה" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: Params) {
  try {
    await db();

    const { hallId } = await context.params;
    const { error, userId, hall } = await getAuthHall(hallId);

    if (error) return error;

    const body = await req.json();

    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();
    const image = String(body?.image || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "חובה להזין שם מנה" },
        { status: 400 }
      );
    }

    const dish = await VenueMenuDish.create({
      ownerId: userId,
      hallId: hall!._id,
      name,
      description,
      image,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      dish,
    });
  } catch (error) {
    console.error("POST menu-dishes failed:", error);
    return NextResponse.json(
      { success: false, message: "שמירת המנה בספרייה נכשלה" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    await db();

    const { hallId } = await context.params;
    const { error, hall } = await getAuthHall(hallId);

    if (error) return error;

    const { searchParams } = new URL(req.url);
    const dishId = String(searchParams.get("dishId") || "").trim();

    if (!dishId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה מנה" },
        { status: 400 }
      );
    }

    await VenueMenuDish.updateOne(
      {
        _id: dishId,
        hallId: hall!._id,
      },
      {
        $set: {
          isActive: false,
        },
      }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE menu-dishes failed:", error);
    return NextResponse.json(
      { success: false, message: "מחיקת המנה נכשלה" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import VenueEventMenu from "@/models/VenueEventMenu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPublicMenu(menu: any) {
  const menuObject =
    typeof menu?.toObject === "function" ? menu.toObject() : menu || {};

  const categories = Array.isArray(menuObject.categories)
    ? menuObject.categories
    : [];

  return {
    id: String(menuObject._id || menuObject.id || ""),
    name: String(menuObject.name || "תפריט אירוע"),
    description: String(menuObject.description || ""),
    type: String(menuObject.type || ""),
    eventNote: String(menuObject.eventNote || ""),
    status: String(menuObject.status || "pending"),
    submittedAt: menuObject.submittedAt || null,
    customerNote: String(menuObject.customerNote || ""),
    submittedByName: String(menuObject.submittedByName || ""),
    submittedByPhone: String(menuObject.submittedByPhone || ""),

    categories: categories.map((category: any, index: number) => {
      const dishes = Array.isArray(category?.dishes) ? category.dishes : [];

      return {
        id: String(category?.id || `category-${index + 1}`),
        title: String(category?.title || category?.name || `קטגוריה ${index + 1}`),
        subtitle: String(category?.subtitle || ""),
        eventNote: String(category?.eventNote || ""),
        chooseCount: toNumber(
          category?.eventMaxChoices ?? category?.eventMinChoices,
          1
        ),
        originalChooseCount: toNumber(
          category?.maxChoices ?? category?.minChoices,
          1
        ),
        dishes: dishes.map((dish: any, dishIndex: number) => ({
          id: String(dish?.id || dish?._id || `dish-${dishIndex + 1}`),
          name: String(dish?.name || "מנה ללא שם"),
          description: String(dish?.description || ""),
          image: String(dish?.image || ""),
          tags: Array.isArray(dish?.tags) ? dish.tags.map(String) : [],
        })),
      };
    }),

    selectedDishes: Array.isArray(menuObject.selectedDishes)
      ? menuObject.selectedDishes
      : [],
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "קישור לא תקין" },
        { status: 400 }
      );
    }

    const menu = await VenueEventMenu.findOne({
      selectionToken: token,
    }).lean();

    if (!menu) {
      return NextResponse.json(
        { success: false, message: "התפריט לא נמצא או שהקישור לא תקין" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      menu: buildPublicMenu(menu),
    });
  } catch (error) {
    console.error("GET public menu failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת התפריט נכשלה",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "קישור לא תקין" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const selectedDishes = Array.isArray(body?.selectedDishes)
      ? body.selectedDishes
      : [];

    const submittedByName = String(body?.submittedByName || "").trim();
    const submittedByPhone = normalizePhone(body?.submittedByPhone);
    const customerNote = String(body?.customerNote || "").trim();

    const menu = await VenueEventMenu.findOne({
      selectionToken: token,
    });

    if (!menu) {
      return NextResponse.json(
        { success: false, message: "התפריט לא נמצא או שהקישור לא תקין" },
        { status: 404 }
      );
    }

    const categories = Array.isArray(menu.categories) ? menu.categories : [];

    for (const category of categories as any[]) {
      const categoryId = String(category.id || "");
      const chooseCount = toNumber(
        category.eventMaxChoices ?? category.eventMinChoices,
        1
      );

      const selectedForCategory = selectedDishes.filter(
        (item: any) => String(item.categoryId || "") === categoryId
      );

      if (selectedForCategory.length !== chooseCount) {
        return NextResponse.json(
          {
            success: false,
            message: `בקטגוריה "${category.title || category.name}" צריך לבחור בדיוק ${chooseCount} מנות`,
          },
          { status: 400 }
        );
      }

      const allowedDishIds = new Set(
        Array.isArray(category.dishes)
          ? category.dishes.map((dish: any) => String(dish.id || dish._id || ""))
          : []
      );

      const hasInvalidDish = selectedForCategory.some(
        (item: any) => !allowedDishIds.has(String(item.dishId || ""))
      );

      if (hasInvalidDish) {
        return NextResponse.json(
          {
            success: false,
            message: `נבחרה מנה לא תקינה בקטגוריה "${category.title || category.name}"`,
          },
          { status: 400 }
        );
      }
    }

    const normalizedSelectedDishes = selectedDishes.map((item: any) => ({
      categoryId: String(item.categoryId || ""),
      categoryTitle: String(item.categoryTitle || ""),
      dishId: String(item.dishId || ""),
      dishName: String(item.dishName || ""),
    }));

    menu.selectedDishes = normalizedSelectedDishes;
    menu.customerNote = customerNote;
    menu.submittedByName = submittedByName;
    menu.submittedByPhone = submittedByPhone;
    menu.submittedAt = new Date();
    menu.status = menu.status === "approved" ? "updated" : "submitted";

    await menu.save();

    return NextResponse.json({
      success: true,
      message: "בחירת המנות נשמרה בהצלחה",
      menu: buildPublicMenu(menu),
    });
  } catch (error) {
    console.error("POST public menu failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "שמירת בחירת המנות נכשלה",
      },
      { status: 500 }
    );
  }
}
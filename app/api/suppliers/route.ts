import { NextRequest, NextResponse } from "next/server";
import Supplier from "@/models/Supplier";
import db from "@/lib/db";

/* =========================================================
   GET – ספקים לפי תחום ותת־תחום
   /api/suppliers?categoryId=...&sub=...
========================================================= */

export async function GET(request: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(
      request.url
    );

    const categoryId =
      searchParams.get("categoryId");

    const category =
      searchParams.get("category");

    const sub =
      searchParams.get("sub");

    /* =========================
       VALIDATION
    ========================= */

    if (!sub) {
      return NextResponse.json(
        {
          error: "sub is required",
        },
        { status: 400 }
      );
    }

    /* =========================
       QUERY
    ========================= */

    let query: any = {
      sub,
    };

    // עדיפות ל-categoryId
    if (
      categoryId &&
      categoryId !== "undefined"
    ) {
      query.categoryId = categoryId;
    }

    // fallback לפי category
    else if (category) {
      query.category = category;
    }

    const suppliers =
      await Supplier.find(query)
        .sort({
          createdAt: -1,
        })
        .lean();

    return NextResponse.json(
      suppliers
    );
  } catch (error) {
    console.error(
      "GET suppliers error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed loading suppliers",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST – הוספת ספק חדש למאגר
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    await db();

    const body =
      await request.json();

    const {
      categoryId,
      category,
      sub,
      name,
      phone,
      basePrice,
      advancePrice,
      includes,
    } = body;

    /* =========================
       VALIDATION
    ========================= */

    if (
      !categoryId ||
      !category ||
      !sub ||
      !name
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields",
        },
        { status: 400 }
      );
    }

    /* =========================
       CREATE
    ========================= */

    const supplier =
      await Supplier.create({
        categoryId,
        category,
        sub,

        name,

        phone: phone || "",

        basePrice:
          Number(basePrice || 0),

        advancePrice:
          Number(advancePrice || 0),

        includes:
          Array.isArray(includes)
            ? includes
            : [],

        notes: "",
      });

    return NextResponse.json(
      supplier
    );
  } catch (error) {
    console.error(
      "POST supplier error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed creating supplier",
      },
      { status: 500 }
    );
  }
}
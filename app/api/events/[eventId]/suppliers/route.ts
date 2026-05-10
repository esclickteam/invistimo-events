import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * ⚠️ IMPORTANT
 * Side-effect imports כדי לכפות רישום מודלים ב-mongoose
 * (חובה ב-Next.js App Router + populate)
 */
import "@/models/Supplier";
import "@/models/EventSupplier";

import EventSupplier from "@/models/EventSupplier";

/* =========================================================
   GET – כל הספקים של האירוע
========================================================= */
export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
    }>;
  }
) {
  try {
    await db();

    const { eventId } =
      await context.params;

    const rows =
      await EventSupplier.find({
        eventId,
      })
        .populate("supplierId")
        .populate("selectedSupplier") // ✅ חדש
        .lean();

    return NextResponse.json(rows);
  } catch (error) {
    console.error(
      "GET event suppliers error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed loading suppliers",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST – הוספת שורת ספק לאירוע
========================================================= */
export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
    }>;
  }
) {
  try {
    await db();

    const { eventId } =
      await context.params;

    const body =
      await request.json();

    const {
      categoryId,
      category,
      sub,
    } = body;

    if (
      !categoryId ||
      !category ||
      !sub
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields",
        },
        {
          status: 400,
        }
      );
    }

    const row =
      await EventSupplier.create({
        eventId,

        categoryId,

        category,

        sub,

        /* ======================
           DEFAULTS
        ====================== */

        supplierName: "",

        selectedSupplier: null,

        supplierId: null,

        price: 0,

        advance: 0,

        balance: 0,

        notes: "",

        files: [],
      });

    /**
     * ✅ populate גם ביצירה
     * כדי שה-frontend יקבל
     * אובייקט מלא
     */
    const populatedRow =
      await EventSupplier.findById(
        row._id
      )
        .populate("supplierId")
        .populate(
          "selectedSupplier"
        )
        .lean();

    return NextResponse.json(
      populatedRow
    );
  } catch (error) {
    console.error(
      "POST event supplier error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed creating event supplier",
      },
      {
        status: 500,
      }
    );
  }
}
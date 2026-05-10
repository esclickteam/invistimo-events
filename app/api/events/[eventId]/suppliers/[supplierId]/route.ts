import {
  NextRequest,
  NextResponse,
} from "next/server";

import db from "@/lib/db";

/**
 * ⚠️ חובה
 */
import "@/models/Supplier";
import "@/models/EventSupplier";

import EventSupplier from "@/models/EventSupplier";

/* =========================================================
   PATCH – עדכון שורת ספק
========================================================= */

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      supplierId: string;
    }>;
  }
) {
  try {
    await db();

    const { supplierId } =
      await context.params;

    const body =
      await request.json();

    const updateData = {
      ...(body.selectedSupplier !==
        undefined && {
        selectedSupplier:
          body.selectedSupplier,
      }),

      ...(body.supplierName !==
        undefined && {
        supplierName:
          body.supplierName,
      }),

      ...(body.price !==
        undefined && {
        price:
          Number(body.price) || 0,
      }),

      ...(body.advance !==
        undefined && {
        advance:
          Number(body.advance) || 0,
      }),

      ...(body.balance !==
        undefined && {
        balance:
          Number(body.balance) || 0,
      }),

      ...(body.notes !==
        undefined && {
        notes: body.notes,
      }),
    };

    const updated =
      await EventSupplier.findByIdAndUpdate(
        supplierId,
        updateData,
        {
          new: true,
        }
      )
        .populate("supplierId")
        .populate(
          "selectedSupplier"
        )
        .lean();

    return NextResponse.json(
      updated
    );
  } catch (error) {
    console.error(
      "PATCH supplier row error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed updating supplier row",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE – מחיקת שורת ספק
========================================================= */

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      supplierId: string;
    }>;
  }
) {
  try {
    await db();

    const { supplierId } =
      await context.params;

    await EventSupplier.findByIdAndDelete(
      supplierId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE supplier row error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed deleting supplier row",
      },
      {
        status: 500,
      }
    );
  }
}
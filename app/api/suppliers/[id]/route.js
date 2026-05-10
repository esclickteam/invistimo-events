import { NextResponse } from "next/server";
import Supplier from "@/models/Supplier";
import db from "@/lib/db";

/* =========================
   DELETE SUPPLIER
========================= */

export async function DELETE(
  request,
  context
) {
  try {
    await db();

    const { id } =
      await context.params;

    await Supplier.findByIdAndDelete(
      id
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE supplier error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed deleting supplier",
      },
      { status: 500 }
    );
  }
}
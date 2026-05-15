import { NextResponse } from "next/server";
import { ADMIN_PACKAGES } from "@/lib/adminPackages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      packages: ADMIN_PACKAGES,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
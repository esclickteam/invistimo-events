import { NextRequest, NextResponse } from "next/server";
import { loadPublicWeddingSite } from "@/lib/weddingWebsite/loadPublicWeddingSite";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Public Wedding Website payload.
 * Completely separate from /api/invite/[shareId].
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await context.params;
    const token = req.nextUrl.searchParams.get("token");
    const preview = req.nextUrl.searchParams.get("preview");

    const payload = await loadPublicWeddingSite({
      shareId,
      token,
      allowDraft: preview === "1" || preview === "draft",
    });

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Wedding website not found" },
        { status: 404 }
      );
    }

    // Draft preview via public API still requires preview flag; never expose draft casually
    if (payload.status !== "published" && preview !== "1" && preview !== "draft") {
      return NextResponse.json(
        { success: false, error: "Wedding website not published" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, website: payload },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (err) {
    console.error("[api/w] error", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

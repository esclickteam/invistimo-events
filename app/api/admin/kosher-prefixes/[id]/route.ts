import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  deleteKosherPrefix,
  listKosherPrefixes,
  updateKosherPrefix,
  validateKosherPrefixInput,
} from "@/lib/kosherPhones/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdmin(auth: Awaited<ReturnType<typeof getUserIdFromRequest>>) {
  return Boolean(auth && auth.role === "admin" && !auth.impersonated);
}

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function readId(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return String(params?.id || "").trim();
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const id = await readId(context);
    const body = await req.json().catch(() => ({}));
    const patch: { prefix?: string; carrier?: string; active?: boolean } = {};

    if (Object.prototype.hasOwnProperty.call(body, "prefix") || Object.prototype.hasOwnProperty.call(body, "carrier")) {
      const parsed = validateKosherPrefixInput({
        prefix: body.prefix,
        carrier: body.carrier,
      });
      if (!parsed.ok) {
        return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
      }
      patch.prefix = parsed.prefix;
      patch.carrier = parsed.carrier;
    }
    if (typeof body.active === "boolean") patch.active = body.active;

    const updated = await updateKosherPrefix(id, patch);
    if (!updated.ok) {
      return NextResponse.json({ success: false, error: updated.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, prefixes: await listKosherPrefixes() });
  } catch (error) {
    console.error("kosher prefix update failed", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const deleted = await deleteKosherPrefix(await readId(context));
    if (!deleted.ok) {
      return NextResponse.json({ success: false, error: deleted.error }, { status: 404 });
    }
    return NextResponse.json({ success: true, prefixes: await listKosherPrefixes() });
  } catch (error) {
    console.error("kosher prefix delete failed", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

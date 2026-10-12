import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  createKosherPrefix,
  listKosherPrefixes,
  validateKosherPrefixInput,
} from "@/lib/kosherPhones/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdmin(auth: Awaited<ReturnType<typeof getUserIdFromRequest>>) {
  return Boolean(auth && auth.role === "admin" && !auth.impersonated);
}

export async function GET(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const prefixes = await listKosherPrefixes();
    return NextResponse.json({ success: true, prefixes });
  } catch (error) {
    console.error("kosher prefixes list failed", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = validateKosherPrefixInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const created = await createKosherPrefix(parsed);
    if (!created.ok) {
      return NextResponse.json({ success: false, error: created.error }, { status: 409 });
    }

    const prefixes = await listKosherPrefixes();
    return NextResponse.json({ success: true, prefixes });
  } catch (error) {
    console.error("kosher prefix create failed", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

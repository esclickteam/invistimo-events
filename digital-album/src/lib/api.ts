import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) return jsonError(err.message, err.status);
  if (err instanceof ZodError) {
    return jsonError("קלט לא תקין", 400, { issues: err.issues });
  }
  if (err instanceof Error) {
    if (err.message === "FORBIDDEN") return jsonError("אין הרשאה", 403);
    if (err.message === "NOT_FOUND") return jsonError("לא נמצא", 404);
    if (err.message === "QUOTA_EXCEEDED") return jsonError("חריגה ממכסת האחסון או השימוש", 402);
    console.error(err);
    return jsonError(err.message || "שגיאת שרת", 500);
  }
  console.error(err);
  return jsonError("שגיאת שרת", 500);
}

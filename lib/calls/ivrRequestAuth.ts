/**
 * Shared auth helpers for IVR HTTP routes.
 *
 * getUserIdFromRequest() returns AuthPayload ({ userId, role, ... }),
 * NOT a bare Mongo id string. Passing the whole payload to User.findById
 * causes: Cast to ObjectId failed for value "{ userId, role, ... }".
 */

import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  getUserIdFromRequest,
  type AuthPayload,
} from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import { isIvrCallsUser } from "@/lib/calls/callsType";

export function resolveAuthUserId(
  auth: AuthPayload | null | undefined
): string | null {
  const raw = auth?.userId;
  if (typeof raw !== "string") return null;
  const userId = raw.trim();
  if (!userId) return null;
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return userId;
}

/** Optional admin target override from query/body — must be a bare ObjectId string. */
export function resolveOptionalTargetUserId(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "object") return null;
  const userId = String(value).trim();
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  return userId;
}

export async function requireIvrSession(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  const userId = resolveAuthUserId(auth);
  if (!userId) {
    return { error: "UNAUTHORIZED" as const, status: 401 as const };
  }

  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    return { error: "UNAUTHORIZED" as const, status: 401 as const };
  }

  const role = String(user.role || "");
  const isAdmin = role === "admin";

  if (!isAdmin && !isIvrCallsUser(user)) {
    return { error: "FORBIDDEN" as const, status: 403 as const };
  }

  return { auth: auth as AuthPayload, user, userId, isAdmin };
}

export async function resolveIvrTargetUser(input: {
  sessionUser: any;
  isAdmin: boolean;
  requestedUserId?: unknown;
}) {
  const override = input.isAdmin
    ? resolveOptionalTargetUserId(input.requestedUserId)
    : null;
  const targetId = override || String(input.sessionUser._id);

  if (targetId === String(input.sessionUser._id)) {
    return input.sessionUser;
  }

  return User.findById(targetId);
}

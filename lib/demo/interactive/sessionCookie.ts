import { cookies } from "next/headers";
import {
  createSession,
  getSession,
} from "@/lib/demo/interactive/store";
import type { DemoSession } from "@/lib/demo/interactive/types";

export const DEMO_SESSION_COOKIE = "invistimo_demo_sid";
const MAX_AGE = 60 * 60 * 4;

export async function readDemoSession(): Promise<DemoSession | null> {
  const jar = await cookies();
  const id = jar.get(DEMO_SESSION_COOKIE)?.value || "";
  if (!id) return null;
  return getSession(id);
}

export async function ensureDemoSession(): Promise<DemoSession> {
  const existing = await readDemoSession();
  if (existing) return existing;
  const created = createSession();
  const jar = await cookies();
  jar.set(DEMO_SESSION_COOKIE, created.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return created;
}

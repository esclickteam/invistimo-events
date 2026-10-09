import { cookies } from "next/headers";
import {
  packDemoSession,
  unpackDemoSession,
} from "@/lib/demo/interactive/sessionPack";
import {
  createSession,
  getSession,
  hydrateSession,
} from "@/lib/demo/interactive/store";
import type { DemoSession } from "@/lib/demo/interactive/types";

export const DEMO_SESSION_COOKIE = "invistimo_demo_sid";
const CHUNK_COOKIE = "invistimo_demo_c";
const CHUNK_SIZE = 2800;
const MAX_CHUNKS = 6;
const MAX_AGE = 60 * 60 * 4;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

function readPacked(jar: Awaited<ReturnType<typeof cookies>>) {
  let packed = "";
  for (let index = 0; index < MAX_CHUNKS; index += 1) {
    const part = jar.get(`${CHUNK_COOKIE}${index}`)?.value || "";
    if (!part) break;
    packed += part;
  }
  return packed;
}

export async function commitDemoSession(session: DemoSession | null) {
  if (!session?.id) return;
  const jar = await cookies();
  const packed = packDemoSession(session);
  const parts = packed.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "g")) || [];
  if (!parts.length || parts.length > MAX_CHUNKS) return;
  jar.set(DEMO_SESSION_COOKIE, session.id, cookieOptions);
  parts.forEach((part, index) => {
    jar.set(`${CHUNK_COOKIE}${index}`, part, cookieOptions);
  });
  for (let index = parts.length; index < MAX_CHUNKS; index += 1) {
    jar.delete(`${CHUNK_COOKIE}${index}`);
  }
}

export async function readDemoSession(): Promise<DemoSession | null> {
  const jar = await cookies();
  const id = jar.get(DEMO_SESSION_COOKIE)?.value || "";
  if (!id) return null;

  const restored = unpackDemoSession(readPacked(jar));
  if (restored && restored.id === id) hydrateSession(restored);
  return getSession(id);
}

export async function ensureDemoSession(): Promise<DemoSession> {
  const existing = await readDemoSession();
  if (existing) return existing;
  const created = createSession();
  await commitDemoSession(created);
  return created;
}

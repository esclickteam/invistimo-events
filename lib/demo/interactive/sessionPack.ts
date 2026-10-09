import { gunzipSync, gzipSync } from "zlib";
import type { DemoSession } from "@/lib/demo/interactive/types";

export function packDemoSession(session: DemoSession) {
  return gzipSync(Buffer.from(JSON.stringify(session))).toString("base64url");
}

export function unpackDemoSession(packed: string): DemoSession | null {
  try {
    const json = gunzipSync(Buffer.from(packed, "base64url")).toString("utf8");
    const session = JSON.parse(json) as DemoSession;
    if (!session?.id || !session?.guests || !session?.event) return null;
    return session;
  } catch {
    return null;
  }
}

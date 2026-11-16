import { processNextJobs } from "@/lib/jobs";
import { handleApiError, jsonOk } from "@/lib/api";
import { env } from "@/lib/env";

/** Internal worker kick — protected by shared secret in non-dev. */
export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      const secret = req.headers.get("x-worker-secret");
      if (secret !== env.authSecret) {
        return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }
    const results = await processNextJobs(10);
    return jsonOk({ results });
  } catch (e) {
    return handleApiError(e);
  }
}

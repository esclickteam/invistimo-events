/**
 * Fire-and-forget trigger for call-work-order auto-open after shift changes.
 */
export async function triggerCallWorkOrdersAutoOpen(dateKey: string) {
  const key = String(dateKey || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return { ok: false, reason: "INVALID_DATE" };

  const secret =
    process.env.CRON_SECRET ||
    process.env.AUTO_OPEN_SECRET ||
    process.env.CALL_WORK_ORDERS_CRON_SECRET ||
    "";

  if (!secret) {
    console.warn(
      "[triggerCallWorkOrdersAutoOpen] missing CRON_SECRET — skip auto-open trigger"
    );
    return { ok: false, reason: "MISSING_SECRET" };
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!base) {
    console.warn(
      "[triggerCallWorkOrdersAutoOpen] missing app URL — skip auto-open trigger"
    );
    return { ok: false, reason: "MISSING_BASE_URL" };
  }

  const url = `${String(base).replace(/\/$/, "")}/api/admin/call-work-orders/auto-open?date=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ date: key }),
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(
        "[triggerCallWorkOrdersAutoOpen] failed",
        res.status,
        text.slice(0, 500)
      );
      return { ok: false, reason: `HTTP_${res.status}` };
    }

    return { ok: true };
  } catch (error) {
    console.error("[triggerCallWorkOrdersAutoOpen] error", error);
    return { ok: false, reason: "FETCH_FAILED" };
  }
}

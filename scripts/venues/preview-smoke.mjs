/**
 * Preview access + minimal smoke.
 * Never prints secrets.
 *
 * Env:
 *   PREVIEW_URL (required)
 *   VERCEL_AUTOMATION_BYPASS_SECRET (optional but needed if protection enabled)
 */
const base = String(process.env.PREVIEW_URL || "").replace(/\/$/, "");
const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "").trim();

if (!base) {
  console.log(
    JSON.stringify(
      {
        PREVIEW_ACCESS: "FAIL",
        reason: "PREVIEW_URL missing",
      },
      null,
      2
    )
  );
  process.exit(1);
}

const headers = {
  Accept: "text/html,application/json",
  "User-Agent": "invistimo-venues-preview-smoke",
};
if (bypass) {
  headers["x-vercel-protection-bypass"] = bypass;
}

async function check(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers,
    redirect: "manual",
  });
  const location = res.headers.get("location") || "";
  const text = await res.text().catch(() => "");
  const sso =
    res.status === 401 ||
    res.status === 403 ||
    /vercel\.com\/login|Authentication Required|SSO/i.test(location + text);
  return {
    path,
    status: res.status,
    sso,
    location: location.slice(0, 120),
    bodyHint: text.slice(0, 80).replace(/\s+/g, " "),
  };
}

const checks = [];
for (const path of ["/", "/login", "/api/health", "/api/healthz"]) {
  try {
    checks.push(await check(path));
  } catch (err) {
    checks.push({
      path,
      status: 0,
      sso: false,
      error: String(err?.message || err),
    });
  }
}

const login = checks.find((c) => c.path === "/login");
const accessible = login && !login.sso && login.status > 0 && login.status < 400;

console.log(
  JSON.stringify(
    {
      PREVIEW_ACCESS: accessible ? "PASS" : "FAIL",
      previewUrl: base,
      bypassHeaderUsed: Boolean(bypass),
      checks,
      note: bypass
        ? "Bypass secret was sent (value not printed)."
        : "No VERCEL_AUTOMATION_BYPASS_SECRET in env — SSO-gated Preview will FAIL.",
    },
    null,
    2
  )
);

process.exit(accessible ? 0 : 1);

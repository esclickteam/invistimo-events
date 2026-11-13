/**
 * Isolated browser checks against MongoMemoryServer.
 * No production database. Stripe is used only when the sibling env has an
 * sk_test key. External sends stay disabled. Secrets are not printed.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, devices } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const port = 3312;
const base = `http://127.0.0.1:${port}`;
const password = "Isolated123!";
const email = "isolated-owner@test.local";
const shareId = "isolatedShare";
const guestToken = "isolated-guest-token";

const report: Record<string, unknown> = {};

function readSiblingValue(name: string) {
  const file = path.resolve(root, "..", "invistimo-events", ".env.local");
  if (!fs.existsSync(file)) return "";
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((row) => row.startsWith(`${name}=`));
  if (!line) return "";
  let value = line.slice(name.length + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

function waitForReady(child: ChildProcess) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("next dev did not become ready")), 180000);
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes("Ready")) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`next dev exited ${code}`));
    });
  });
}

async function main() {
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: "invistimo_isolated_test" },
  });
  const uri = mongod.getUri("invistimo_isolated_test");
  process.env.APP_ENV = "test";
  process.env.MONGO_URI = uri;
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = "isolated-browser-jwt-secret";
  process.env.EXTERNAL_SENDS_MODE = "disabled";
  const siblingStripe = readSiblingValue("STRIPE_SECRET_KEY");
  const siblingMaps = readSiblingValue("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  const sandboxStripe = siblingStripe.startsWith("sk_test_") ? siblingStripe : "";
  report.stripeKeyMode = sandboxStripe ? "test" : siblingStripe.startsWith("sk_live_") ? "refused-live" : "missing";
  report.mapsKeyPresent = siblingMaps.startsWith("AIza") && siblingMaps.length > 20;
  delete process.env.STRIPE_SECRET_KEY;

  await mongoose.connect(uri);
  const User = (await import("../models/User")).default;
  const Event = (await import("../models/Event")).default;
  const Invitation = (await import("../models/Invitation")).default;
  const InvitationGuest = (await import("../models/InvitationGuest")).default;

  const owner = await User.create({
    name: "Isolated Owner",
    email,
    password: await bcrypt.hash(password, 10),
    role: "user",
    isActive: true,
    hasPaid: true,
    paidAmount: 1,
    paidAt: new Date("2026-11-01T00:00:00.000Z"),
    guests: 20,
    maxGuests: 20,
    needsPasswordSetup: false,
  });
  const event = await Event.create({
    userId: owner._id,
    email,
    eventType: "wedding",
    title: "Isolated Event",
    date: "2026-12-20",
    time: "19:00",
    status: "active",
    paymentStatus: "paid",
    location: { address: "" },
    zones: [],
    planning: { eventDefinition: { goal: "", vibe: "", size: "", notes: "" }, concept: "" },
    maxGuests: 20,
  });
  const invitation = await Invitation.create({
    ownerId: owner._id,
    eventId: event._id,
    title: "Isolated Event",
    shareId,
    canvasData: {},
    maxGuests: 20,
    guests: [],
  });
  const guest = await InvitationGuest.create({
    invitationId: invitation._id,
    name: "אורח מבודד",
    phone: "0500000099",
    rsvp: "pending",
    guestsCount: 2,
    arrivedCount: 0,
    token: guestToken,
    tableNumber: 1,
    tableName: "שולחן 1",
    tableId: "table-isolated-1",
  });

  const child = spawn("npx", ["next", "dev", "-p", String(port)], {
    cwd: root,
    shell: true,
    env: {
      ...process.env,
      APP_ENV: "test",
      MONGO_URI: uri,
      MONGODB_URI: uri,
      JWT_SECRET: "isolated-browser-jwt-secret",
      EXTERNAL_SENDS_MODE: "disabled",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-PREVIEWTEST",
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: report.mapsKeyPresent ? siblingMaps : "",
      NEXT_PUBLIC_SITE_URL: base,
      STRIPE_SECRET_KEY: sandboxStripe,
    },
  });
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await waitForReady(child);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const measurement: string[] = [];
    const cspErrors: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (text.includes("Content Security Policy") || text.includes("Refused to")) cspErrors.push(text);
    });
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("google-analytics.com") || url.includes("googletagmanager.com") || url.includes("api.stripe.com") || url.includes("maps.googleapis.com")) {
        measurement.push(url);
      }
    });

    const home = await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    const cspHeader = home?.headers()["content-security-policy"] || "";
    const policies = cspHeader.split(/,(?=default-src)/).map((value) => value.trim()).filter(Boolean);
    report.publicCspCount = policies.length;
    report.publicCspDropsEval = policies.some((value) => value.includes("script-src") && !value.includes("unsafe-eval"));
    report.publicCspKeepsInline = policies.some((value) => value.includes("unsafe-inline"));
    report.publicConnectClosed = policies
      .filter((value) => !value.includes("unsafe-eval"))
      .every((value) => !value.includes("wss:") && !/connect-src[^;]*\shttps:(?:\s|;)/.test(value));
    await page.getByRole("dialog", { name: "עוגיות באתר Invistimo" }).waitFor();
    await page.waitForTimeout(1500);
    report.blockedBeforeChoice = !measurement.some((url) => url.includes("google-analytics.com") || url.includes("googletagmanager.com"));
    report.userwayBeforeChoice = (await page.locator("script[src*='userway']").count()) === 0;
    const cookiesBefore = await page.evaluate(() => document.cookie);
    report.noMeasurementCookieBeforeChoice = !cookiesBefore.includes("_ga") && !cookiesBefore.includes("_gid");

    const accept = page.getByRole("button", { name: "אישור הכול" });
    await accept.focus();
    const focusRing = await accept.evaluate((node) => getComputedStyle(node).outlineStyle);
    await page.keyboard.press("Tab");
    const nextName = await page.evaluate(() => (document.activeElement?.textContent || "").trim());
    report.keyboardNames = [await accept.innerText(), nextName];
    report.focusRing = focusRing;
    report.keyboardReachesChoice = nextName.includes("דחיית") || nextName.includes("התאמה");

    await page.getByRole("button", { name: "אישור הכול" }).click();
    await page.waitForTimeout(1500);
    report.previewTestIdLoads = measurement.some((url) => url.includes("G-PREVIEWTEST"));
    report.productionIdNotUsed = !measurement.some((url) => url.includes("G-FFTCP1VN4Y"));
    await page.getByRole("button", { name: "הגדרות עוגיות" }).click();
    await page.getByRole("checkbox", { name: /מדידה וניתוח/ }).uncheck();
    const hits = measurement.length;
    await page.getByRole("button", { name: "שמירת הבחירה" }).click();
    await page.waitForTimeout(700);
    await page.goto(base + "/pricing", { waitUntil: "domcontentloaded" });
    const cookiesAfterRevoke = await page.evaluate(() => document.cookie);
    report.noGaCookieAfterRevoke = !cookiesAfterRevoke.includes("_ga") && !cookiesAfterRevoke.includes("_gid");
    report.revokeStopsFuture = measurement.length === hits && (await page.locator("#invistimo-ga4").count()) === 0 && report.noGaCookieAfterRevoke === true;

    await page.goto(base + "/contact", { waitUntil: "domcontentloaded" });
    await page.addScriptTag({ content: fs.readFileSync(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8") });
    report.contactAxe = await page.evaluate(async () => {
      const outcome = await (window as unknown as { axe: { run: Function } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag22aa"] } });
      return outcome.violations.map((item: { id: string; impact: string | null; nodes: { target: string[] }[] }) => ({
        id: item.id,
        impact: item.impact,
        nodes: item.nodes.length,
        targets: item.nodes.slice(0, 6).map((node) => node.target.join(" ")),
      }));
    });

    const mobile = await browser.newPage({ ...devices["Pixel 7"] });
    await mobile.goto(base + "/", { waitUntil: "domcontentloaded" });
    const banner = mobile.getByRole("dialog", { name: "עוגיות באתר Invistimo" });
    await banner.waitFor();
    const box = await banner.boundingBox();
    const viewport = mobile.viewportSize();
    report.mobileBannerInside = Boolean(box && viewport && box.y + box.height <= viewport.height + 2 && box.width <= viewport.width + 2);
    await mobile.close();

    const loginResponse = await page.goto(base + "/login", { waitUntil: "domcontentloaded" });
    report.appCspKeepsEval = (loginResponse?.headers()["content-security-policy"] || "").includes("unsafe-eval");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "התחברות" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
    report.loginPath = new URL(page.url()).pathname;
    report.loginLanded = report.loginPath !== "/login";

    const rsvp = await page.request.post(base + `/api/invite/${shareId}/rsvp`, {
      data: { token: guestToken, rsvp: "yes", arrivedCount: 2, notes: "isolated" },
    });
    report.rsvpStatus = rsvp.status();
    const savedGuest = await InvitationGuest.findById(guest._id).lean<{ rsvp?: string; arrivedCount?: number }>();
    report.rsvpSaved = savedGuest?.rsvp === "yes" && savedGuest?.arrivedCount === 2;

    const seating = await page.request.post(base + "/api/seating/update-table", {
      data: { invitationId: String(invitation._id), tableId: "table-isolated-1", newNumber: 4 },
    });
    report.seatingStatus = seating.status();
    const seated = await InvitationGuest.findById(guest._id).lean<{ tableName?: string; tableNumber?: number }>();
    report.seatingSaved = seated?.tableName === "שולחן 4" && seated?.tableNumber === 4;

    const checkout = await page.request.post(base + "/api/stripe/checkout", {
      data: { priceKey: "basic_plan_49" },
    });
    const checkoutText = await checkout.text();
    let checkoutUrl = "";
    try {
      const body = JSON.parse(checkoutText) as { url?: string; error?: string };
      checkoutUrl = typeof body.url === "string" ? body.url : "";
      report.stripeError = body.error || "";
    } catch {
      report.stripeError = "unparsed";
    }
    report.stripeStatus = checkout.status();
    report.stripeSandboxSession = checkoutUrl.startsWith("https://checkout.stripe.com/") && checkoutUrl.includes("cs_test");
    report.stripeLiveSession = checkoutUrl.includes("cs_live");
    report.stripeCardNotSubmitted = true;
    if (report.stripeSandboxSession) {
      const pay = await browser.newPage();
      await pay.goto(checkoutUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      report.stripeHost = new URL(pay.url()).host;
      await pay.close();
    } else if (sandboxStripe) {
      const params = new URLSearchParams();
      params.set("mode", "payment");
      params.set("line_items[0][price]", "price_1SdWP9LCgfc20iubG9OFDPVs");
      params.set("line_items[0][quantity]", "1");
      params.set("success_url", `${base}/dashboard`);
      params.set("cancel_url", `${base}/pricing`);
      const priceProbe = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sandboxStripe}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      const priceBody = await priceProbe.json() as { error?: { code?: string; message?: string }; url?: string };
      const message = priceBody.error?.message || "";
      report.stripeSandboxRefusalCode = priceBody.error?.code || "";
      report.stripeSandboxRefusedLivePrice = priceProbe.status === 400 && message.includes("live mode") && message.includes("test mode key") && !priceBody.url;
    }

    const mapsBefore = measurement.filter((url) => url.includes("maps.googleapis.com")).length;
    await page.goto(base + `/dashboard/invitations/${invitation._id}/edit`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    report.mapsLoadedInEventEditor = measurement.filter((url) => url.includes("maps.googleapis.com")).length > mapsBefore;
    report.noGaOnEventEditor = !measurement.slice(hits).some((url) => url.includes("G-PREVIEWTEST") && url.includes("/gtag/js"));

    await page.goto(base + `/invite/${shareId}`, { waitUntil: "load" });
    await page.locator("script[src*='userway']").waitFor({ state: "attached", timeout: 10000 }).catch(() => undefined);
    report.guestBanner = await page.getByRole("dialog", { name: "עוגיות באתר Invistimo" }).count();
    report.guestBannerAbsent = report.guestBanner === 0;
    report.userwayOnGuest = await page.locator("script[src*='userway']").count();
    report.userwayOnGuestLoaded = Number(report.userwayOnGuest) > 0;
    report.cspErrors = cspErrors.slice(0, 8);

    const scan = await browser.newContext();
    const routes = [
      "/",
      "/pricing",
      "/faq",
      "/contact",
      "/cookies",
      "/privacy",
      "/terms",
      "/accessibility",
      "/rsvp",
      "/blog",
      "/info/about",
      "/seating-explained",
      "/event-management",
      "/credit-gifts",
      "/wedding-website",
      "/services/alcohol-management",
      "/invitations/chatuna",
      `/invite/${shareId}`,
      "/login",
      "/dashboard",
    ];
    const routeReport: { path: string; status: number; hosts: string[]; banner: number }[] = [];
    for (const routePath of routes) {
      const probe = await scan.newPage();
      const hosts = new Set<string>();
      probe.on("request", (request) => {
        const url = request.url();
        if (/google-analytics|googletagmanager|userway|maps\.googleapis|stripe/.test(url)) {
          try {
            hosts.add(new URL(url).host);
          } catch {
            hosts.add("unparsed");
          }
        }
      });
      let status = 0;
      try {
        const response = await probe.goto(base + routePath, { waitUntil: "domcontentloaded", timeout: 90000 });
        status = response?.status() || 0;
        if (routePath.startsWith("/invite") || routePath.startsWith("/login") || routePath.startsWith("/dashboard")) {
          await probe.waitForTimeout(1200);
        } else {
          await probe.getByRole("dialog", { name: "עוגיות באתר Invistimo" }).waitFor({ timeout: 8000 }).catch(() => undefined);
        }
      } catch {
        hosts.add("navigation-error");
      }
      const banner = await probe.getByRole("dialog", { name: "עוגיות באתר Invistimo" }).count().catch(() => 0);
      routeReport.push({ path: routePath, status, hosts: [...hosts], banner });
      await probe.close();
    }
    report.routes = routeReport;
    const marketing = new Set(["/", "/pricing", "/faq", "/contact", "/cookies", "/privacy", "/terms", "/accessibility", "/rsvp", "/blog", "/info/about", "/seating-explained", "/event-management", "/credit-gifts", "/wedding-website", "/services/alcohol-management", "/invitations/chatuna"]);
    report.marketingRoutesQuiet = routeReport
      .filter((item) => marketing.has(item.path))
      .every((item) => item.hosts.length === 0 && item.banner === 1 && item.status === 200);
    await scan.close();

    await browser.close();
  } finally {
    console.log(JSON.stringify(report, null, 2));
    if (process.platform === "win32" && child.pid) {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { shell: true });
    } else {
      child.kill();
    }
    await mongoose.disconnect();
    await mongod.stop();
  }

  const production = await fetch("https://www.invistimo.com/", { redirect: "follow" });
  const html = await production.text();
  report.productionPageContainsGaId = html.includes("G-FFTCP1VN4Y");
  if (!report.productionPageContainsGaId) {
    const srcs = [...html.matchAll(/src="([^"]+_next\/static[^"]+\.js)"/g)].slice(0, 8).map((match) => match[1]);
    let found = false;
    for (const src of srcs) {
      const url = src.startsWith("http") ? src : `https://www.invistimo.com${src}`;
      const body = await fetch(url).then((response) => response.text());
      if (body.includes("G-FFTCP1VN4Y")) {
        found = true;
        break;
      }
    }
    report.productionBundleContainsGaId = found;
  }

  console.log(JSON.stringify(report, null, 2));
  const required = ["blockedBeforeChoice", "userwayBeforeChoice", "noMeasurementCookieBeforeChoice", "previewTestIdLoads", "productionIdNotUsed", "revokeStopsFuture", "keyboardReachesChoice", "mobileBannerInside", "loginLanded", "rsvpSaved", "seatingSaved", "stripeCardNotSubmitted", "stripeSandboxRefusedLivePrice", "publicCspDropsEval", "publicConnectClosed", "appCspKeepsEval", "mapsLoadedInEventEditor", "noGaOnEventEditor", "guestBannerAbsent", "userwayOnGuestLoaded", "marketingRoutesQuiet"];
  if (report.stripeLiveSession === true) required.push("stripeLiveSessionBlocked");
  const failed = required.filter((key) => report[key] !== true);
  const contrast = Array.isArray(report.contactAxe) && (report.contactAxe as { id: string }[]).some((item) => item.id === "color-contrast");
  if (failed.length || contrast) {
    console.error(JSON.stringify({ failed, contrast }));
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

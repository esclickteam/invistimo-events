/**
 * One staging-mode contact lead over HTTP.
 * Uses an isolated invistimo_staging database on this machine.
 * Email and GA4 are intercepted on localhost and are not delivered.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const PERSON = {
  name: "בדיקת סטייג",
  email: "staging-trace@invistimo.test",
  phone: "0500000001",
  message: "הודעת בדיקה בלבד",
};

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(raw),
  });
  res.end(raw);
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri("invistimo_staging");
  if (!uri.includes("invistimo_staging") || !uri.includes("127.0.0.1")) {
    throw new Error("refusing to run without a local invistimo_staging database");
  }

  process.env.APP_ENV = "staging";
  process.env.MONGO_ENV_LABEL = "staging";
  process.env.MONGO_URI = uri;
  process.env.MONGODB_URI = uri;
  process.env.NEXT_PUBLIC_SITE_URL = "https://staging.invistimo.com";
  process.env.RESEND_API_KEY = "re_test_local_only";
  process.env.RESEND_BASE_URL = "http://127.0.0.1:9";
  process.env.SUPPORT_EMAIL = "support-staging@invistimo.test";
  process.env.EXTERNAL_SENDS_MODE = "disabled";
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-FFTCP1VN4Y";
  process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET = "";
  delete process.env.VERCEL_ENV;

  const captured: unknown[] = [];
  const leaks: string[] = [];
  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args.map((part) => String(part)).join(" "));
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const target = new URL(url);
    if (target.hostname !== "127.0.0.1" && target.hostname !== "localhost") {
      leaks.push(url);
      throw new Error(`outbound blocked: ${target.hostname}`);
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  const sink = createServer(async (req, res) => {
    captured.push(JSON.parse(await readBody(req)));
    sendJson(res, 200, { ok: true });
  });
  await new Promise<void>((resolve) => sink.listen(0, "127.0.0.1", resolve));
  const sinkPort = (sink.address() as { port: number }).port;
  process.env.CONTACT_TRACE_SINK = `http://127.0.0.1:${sinkPort}/trace`;

  await mongoose.connect(uri);
  const User = (await import("../../models/User")).default;
  const CustomerFile = (await import("../../models/CustomerFile")).default;
  const { POST } = await import("../../app/api/contact/route");
  const { GET } = await import("../../app/api/system/env-isolation/route");
  await User.create({
    name: "Staging owner",
    email: "staging-owner@invistimo.test",
    password: "not-a-real-password",
    role: "staff",
  });

  const server = createServer(async (req, res) => {
    try {
      const host = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      const request = new Request(`${host}${req.url}`, {
        method: req.method,
        headers: { "content-type": req.headers["content-type"] || "application/json" },
        body: req.method === "POST" ? await readBody(req) : undefined,
      });
      const response =
        req.url === "/api/system/env-isolation" ? await GET() : await POST(request);
      const text = await response.text();
      res.writeHead(response.status, { "content-type": "application/json; charset=utf-8" });
      res.end(text);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { success: false });
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  const isolation = await (await originalFetch(`${base}/api/system/env-isolation`)).json();
  if (
    isolation.appEnv !== "staging" ||
    isolation.mongoDbName !== "invistimo_staging" ||
    isolation.externalSends !== "disabled"
  ) {
    throw new Error(`refusing to send a lead: ${JSON.stringify(isolation)}`);
  }

  const response = await originalFetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...PERSON,
      subject: "בדיקה",
      inquiryClient: "contact_page",
      pagePath: "/contact",
      referrer: "https://forged.example/landing",
      utmSource: PERSON.email,
      utmCampaign: PERSON.phone,
      utmMedium: "cpc",
    }),
  });
  const body = await response.json();
  const saved = await CustomerFile.findOne({ phone: PERSON.phone }).lean<{
    submissionId?: string;
  }>();
  const log = logs
    .map((line) => {
      try {
        return JSON.parse(line) as { event?: string; submissionId?: string; result?: string; pageLocation?: string };
      } catch {
        return null;
      }
    })
    .find((entry) => entry?.event === "contact_submission");
  const sinkBody = captured[0] as {
    submissionId?: string;
    email?: { html?: string; to?: string[]; bcc?: string[] };
    measurement?: { events?: Array<{ params?: { submission_id?: string; page_location?: string } }> };
  };

  const summary = {
    url: base,
    commit: process.env.CONTACT_TRACE_COMMIT || "",
    isolation: {
      appEnv: isolation.appEnv,
      mongoDbName: isolation.mongoDbName,
      externalSends: isolation.externalSends,
      siteUrl: isolation.siteUrl,
    },
    httpStatus: response.status,
    blocked: body.blocked === true,
    submissionId: body.submissionId,
    savedSubmissionId: saved?.submissionId || "",
    logResult: log?.result || "",
    logPageLocation: log?.pageLocation || "",
    emailHasId: Boolean(sinkBody?.email?.html?.includes(String(body.submissionId))),
    emailTo: sinkBody?.email?.to || [],
    emailBcc: sinkBody?.email?.bcc || [],
    measurementId: sinkBody?.measurement?.events?.[0]?.params?.submission_id || "",
    measurementLocation: sinkBody?.measurement?.events?.[0]?.params?.page_location || "",
    leaks,
  };
  console.info = originalInfo;
  console.log(JSON.stringify(summary, null, 2));

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await new Promise<void>((resolve) => sink.close(() => resolve()));
  await mongoose.disconnect();
  await mongod.stop();
  globalThis.fetch = originalFetch;

  const pass =
    summary.blocked &&
    summary.submissionId &&
    summary.savedSubmissionId === summary.submissionId &&
    summary.logResult === "blocked" &&
    summary.logPageLocation === "https://staging.invistimo.com/contact" &&
    summary.emailHasId &&
    summary.measurementId === summary.submissionId &&
    summary.measurementLocation === "https://staging.invistimo.com/contact" &&
    summary.leaks.length === 0 &&
    summary.emailBcc[0] === "invistimo9@gmail.com";
  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

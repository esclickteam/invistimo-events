import nodemailer from "nodemailer";
import { readFileSync } from "fs";

function loadEnvFile(path) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.vercel.prod");

const host = process.env.EMAIL_HOST;
const port = Number(process.env.EMAIL_PORT || 465);
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const to = process.argv[2] || user;

console.log("SMTP config", {
  host,
  port,
  user,
  passLen: pass?.length || 0,
  to,
});

const configs = [
  {
    name: "465-secure",
    host,
    port: 465,
    secure: true,
    auth: { user, pass },
  },
  {
    name: "587-starttls",
    host,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  },
  {
    name: "env-port",
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
  },
];

let working = null;

for (const cfg of configs) {
  const transporter = nodemailer.createTransport(cfg);
  try {
    await transporter.verify();
    console.log("VERIFY OK", cfg.name);
    working = cfg;
    break;
  } catch (error) {
    console.log(
      "VERIFY FAIL",
      cfg.name,
      error.code || "",
      error.responseCode || "",
      error.message,
    );
  }
}

if (!working) {
  console.error("No working SMTP transport");
  process.exit(1);
}

const transporter = nodemailer.createTransport(working);

try {
  const info = await transporter.sendMail({
    from: `"Invistimo" <${user}>`,
    to,
    subject: `SMTP test ${new Date().toISOString()}`,
    text: "SMTP delivery test from invistimo-events",
    html: "<p>SMTP delivery test from invistimo-events</p>",
    replyTo: user,
  });
  console.log("SEND OK", {
    messageId: info.messageId,
    response: info.response,
    accepted: info.accepted,
    rejected: info.rejected,
    from: user,
    to,
  });
} catch (error) {
  console.error("SEND FAIL", {
    code: error.code,
    responseCode: error.responseCode,
    message: error.message,
    response: error.response,
    command: error.command,
  });
  process.exit(1);
}

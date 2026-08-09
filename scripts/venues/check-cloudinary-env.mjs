/**
 * Safe Cloudinary env presence check — never prints secret values.
 * Usage: node scripts/venues/check-cloudinary-env.mjs
 * Optional: CLOUDINARY_CHECK_SERVICE=production|preview|local
 */
const service = process.env.CLOUDINARY_CHECK_SERVICE || "local";

const names = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_URL",
];

const rows = names.map((name) => ({
  name,
  status: process.env[name] ? "EXISTS" : "MISSING",
  service,
}));

const required = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const ok =
  required.every((n) => Boolean(process.env[n])) ||
  Boolean(process.env.CLOUDINARY_URL);

console.log(
  JSON.stringify(
    {
      service,
      ok,
      variables: rows,
      note: "Values are never printed. CLOUDINARY_URL alone can satisfy config if SDK parses it.",
    },
    null,
    2
  )
);

process.exit(ok ? 0 : 1);

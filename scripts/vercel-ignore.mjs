const ref = process.env.VERCEL_GIT_COMMIT_REF || "";
const env = process.env.VERCEL_ENV || "";
const allowed = new Set([
  "feat/professional-blog",
  "fix/magazine-launch-followup",
  "fix/hebrew-font-cls",
  "content/magazine-drafts-preview",
]);

// Vercel builds when this command exits 1, and skips the deployment when it exits 0.
if (env === "production" || allowed.has(ref)) process.exit(1);
process.exit(0);

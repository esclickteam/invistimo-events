import { getCloudinaryRootFolder } from "@/lib/env/appEnv";

/**
 * Build an environment-isolated Cloudinary folder path.
 * Staging → invistimo/staging/...
 * Production → invistimo/production/...
 */
export function cloudinaryFolder(...parts: Array<string | undefined | null>) {
  const root = getCloudinaryRootFolder();
  const rest = parts
    .map((p) => String(p || "").trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return [root, ...rest].join("/");
}

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/api";

/** Simple SVG QR-like badge with album URL — print-friendly. Real QR lib can replace later. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return jsonError("לא נמצא", 404);

  const url = `${env.appUrl}/a/${slug}`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="560" viewBox="0 0 480 560">
  <rect width="480" height="560" fill="#F7F1E8"/>
  <rect x="40" y="40" width="400" height="400" rx="24" fill="#FFFCF7" stroke="#C4A574" stroke-width="2"/>
  <text x="240" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#1C1917">ALBUM</text>
  <text x="240" y="190" text-anchor="middle" font-family="Arial" font-size="22" fill="#1C1917">${escapeXml(event.hostNames)}</text>
  <text x="240" y="240" text-anchor="middle" font-family="Arial" font-size="14" fill="#6B645C">סירקו / היכנסו לאלבום</text>
  <rect x="140" y="270" width="200" height="200" fill="#1C1917"/>
  <rect x="160" y="290" width="160" height="160" fill="#F7F1E8"/>
  <rect x="180" y="310" width="40" height="40" fill="#1C1917"/>
  <rect x="260" y="310" width="40" height="40" fill="#1C1917"/>
  <rect x="180" y="390" width="40" height="40" fill="#1C1917"/>
  <rect x="220" y="350" width="40" height="40" fill="#1C1917"/>
  <text x="240" y="500" text-anchor="middle" font-family="Arial" font-size="12" fill="#6B645C">${escapeXml(url)}</text>
  <text x="240" y="530" text-anchor="middle" font-family="Arial" font-size="11" fill="#A8844F">להדפסה · קישור אישי לאלבום</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!
  );
}

import { redirect, notFound } from "next/navigation";

/**
 * WhatsApp Meta templates append the button param after /invite/.
 * Wedding Website package sends suffix `site/[shareId]` so guests land here,
 * then we redirect to the real public wedding site `/w/[shareId]`.
 *
 * Regular guest links (`/invite/[shareId]?token=...`) are untouched.
 */
export default async function InviteSiteBridgePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const clean = String(shareId || "").trim();
  if (!clean || clean.includes("/") || clean.includes("?")) {
    notFound();
  }
  redirect(`/w/${encodeURIComponent(clean)}`);
}

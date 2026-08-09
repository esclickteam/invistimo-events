import { redirect, notFound } from "next/navigation";
import VenueShell from "@/components/venues/VenueShell";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  children: React.ReactNode;
  params: Promise<{ hallId: string }>;
};

export default async function VenueHallLayout({ children, params }: Props) {
  const { hallId } = await params;

  const { ctx, error } = await requireVenueAccess(undefined, hallId, "dashboard.view");

  if (error || !ctx) {
    const status = error?.status ?? 403;
    if (status === 401) {
      redirect("/login");
    }
    notFound();
  }

  const hall = ctx.hall as {
    name?: string;
    subtitle?: string;
    image?: string;
  };

  return (
    <VenueShell
      hallId={ctx.venueId}
      hallName={String(hall?.name || "אולם")}
      hallSubtitle={String(hall?.subtitle || "")}
      hallImage={String(hall?.image || "")}
      permissions={ctx.permissions}
    >
      {children}
    </VenueShell>
  );
}

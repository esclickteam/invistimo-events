import { Stack, usePathname } from "expo-router";
import { RoleGuard } from "@/src/RoleGuard";
import { RoleShell } from "@/src/RoleShell";
import { venueNav } from "@/src/nav";
import { VenueProvider, useVenueHall } from "@/src/venueHall";

function VenueShellInner() {
  const pathname = usePathname();
  const hall = useVenueHall();
  const hallId = hall.hallId || pathname.match(/halls\/([^/]+)/)?.[1] || "";
  return (
    <RoleShell palette="venue" sections={venueNav(hallId, hall.permissions)}>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleShell>
  );
}

export default function VenueLayout() {
  return (
    <RoleGuard allow={["venue"]}>
      <VenueProvider>
        <VenueShellInner />
      </VenueProvider>
    </RoleGuard>
  );
}

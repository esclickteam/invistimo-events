import { Stack } from "expo-router";
import { RoleGuard } from "@/src/RoleGuard";
import { RoleShell } from "@/src/RoleShell";
import { producerStaffNav } from "@/src/nav";

export default function ProducerStaffLayout() {
  return (
    <RoleGuard allow={["producer_staff"]}>
      <RoleShell palette="producer" sections={producerStaffNav()}>
        <Stack screenOptions={{ headerShown: false }} />
      </RoleShell>
    </RoleGuard>
  );
}

import { Stack } from "expo-router";
import { RoleGuard } from "@/src/RoleGuard";
import { RoleShell } from "@/src/RoleShell";
import { producerNav } from "@/src/nav";

export default function ProducerLayout() {
  return (
    <RoleGuard allow={["producer"]}>
      <RoleShell palette="producer" sections={producerNav()}>
        <Stack screenOptions={{ headerShown: false }} />
      </RoleShell>
    </RoleGuard>
  );
}

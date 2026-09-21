import { Stack } from "expo-router";
import { RoleGuard } from "@/src/RoleGuard";
import { RoleShell } from "@/src/RoleShell";
import { adminNav } from "@/src/nav";

export default function AdminLayout() {
  return (
    <RoleGuard allow={["admin"]}>
      <RoleShell palette="admin" sections={adminNav()}>
        <Stack screenOptions={{ headerShown: false }} />
      </RoleShell>
    </RoleGuard>
  );
}

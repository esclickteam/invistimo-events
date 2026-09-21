import { Stack } from "expo-router";
import { useAuth } from "@/src/auth";
import { RoleGuard } from "@/src/RoleGuard";
import { RoleShell } from "@/src/RoleShell";
import { staffNav } from "@/src/nav";

export default function StaffLayout() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["staff"]}>
      <RoleShell palette="staff" sections={staffNav(user)}>
        <Stack screenOptions={{ headerShown: false }} />
      </RoleShell>
    </RoleGuard>
  );
}

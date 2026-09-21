import { Redirect, Stack, usePathname } from "expo-router";
import { colors } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { useEventData } from "@/src/event";
import { RoleGuard } from "@/src/RoleGuard";
import { RoleShell } from "@/src/RoleShell";
import { customerNav } from "@/src/nav";
import { userIsWeddingChallengesOnly } from "@/src/roles";

export default function CustomerLayout() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { invitation, eventLive, checkInEnabled } = useEventData();
  const gameOnly = userIsWeddingChallengesOnly(user);
  const blocked =
    gameOnly &&
    !pathname.includes("challenges") &&
    !pathname.includes("security");
  if (blocked) return <Redirect href="/(app)/more/challenges" />;
  return (
    <RoleGuard allow={["customer", "customer_production", "customer_challenges"]}>
      <RoleShell
        palette="customer"
        sections={customerNav({ user, invitation, eventLive, checkInEnabled })}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.cream },
          }}
        />
      </RoleShell>
    </RoleGuard>
  );
}

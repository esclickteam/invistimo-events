import type { ReactNode } from "react";
import { Redirect, type Href } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/src/auth";
import { colors } from "@/src/theme";
import {
  experienceAllowsHref,
  homeHref,
  resolveAppExperience,
  type AppExperience,
} from "@/src/roles";

export function RoleGuard({
  allow,
  children,
}: {
  allow: AppExperience[];
  children: ReactNode;
}) {
  const { ready, user } = useAuth();
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  const experience = resolveAppExperience(user);
  if (experience === "guest" || !allow.includes(experience)) {
    return <Redirect href={homeHref(experience) as Href} />;
  }
  return <>{children}</>;
}

export function requireHref(href: string, userExperience: ReturnType<typeof resolveAppExperience>) {
  return experienceAllowsHref(userExperience, href);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
});

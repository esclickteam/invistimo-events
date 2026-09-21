import { ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Network from "expo-network";
import { colors, radius } from "@/src/theme";

function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    function apply(state: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      if (mounted) setOffline(!connected);
    }
    void Network.getNetworkStateAsync().then(apply).catch(() => undefined);
    const sub = Network.addNetworkStateListener?.(apply);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  if (!offline) return null;
  return (
    <View style={styles.offline}>
      <Text style={styles.offlineText}>אין חיבור לאינטרנט</Text>
    </View>
  );
}

export function Page({
  children,
  scroll = true,
  footer,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={styles.page} edges={["left", "right"]}>
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function ScreenTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.kicker}>INVISTIMO</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.soft}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={[styles.primary, inactive && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.outline}>
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  );
}

export function StatusPill({ status }: { status?: string }) {
  const key = status || "pending";
  const palette =
    key === "yes"
      ? { bg: colors.yesBg, fg: colors.yes, label: "מגיע" }
      : key === "no"
        ? { bg: colors.noBg, fg: colors.no, label: "לא מגיע" }
        : key === "maybe"
          ? { bg: colors.maybeBg, fg: colors.maybe, label: "מתלבטים" }
          : { bg: colors.pendingBg, fg: colors.pending, label: "בהמתנה" };
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>{palette.label}</Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <Text style={styles.empty}>{text}</Text>
    </Card>
  );
}

export function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return <Text style={styles.error}>{text}</Text>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 16, paddingBottom: 32 },
  fill: { flex: 1, padding: 16 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: 8,
  },
  titleBlock: { marginBottom: 16, alignItems: "flex-end" },
  kicker: {
    color: colors.gold,
    fontFamily: "Heebo_700Bold",
    letterSpacing: 1.4,
    fontSize: 11,
  },
  title: {
    color: colors.brownText,
    fontFamily: "Heebo_700Bold",
    fontSize: 28,
    textAlign: "right",
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: "Heebo_500Medium",
    fontSize: 14,
    textAlign: "right",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  field: { marginBottom: 12 },
  label: {
    marginBottom: 6,
    textAlign: "right",
    color: colors.ink,
    fontFamily: "Heebo_600SemiBold",
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "right",
    fontFamily: "Heebo_400Regular",
    color: colors.brownText,
    fontSize: 16,
  },
  primary: {
    backgroundColor: colors.champagne,
    borderRadius: radius.pill,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  disabled: { opacity: 0.55 },
  primaryText: {
    color: colors.white,
    fontFamily: "Heebo_700Bold",
    fontSize: 16,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.champagne,
    borderRadius: radius.pill,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  outlineText: {
    color: colors.champagneDark,
    fontFamily: "Heebo_700Bold",
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontFamily: "Heebo_700Bold", fontSize: 12 },
  empty: {
    textAlign: "right",
    color: colors.muted,
    fontFamily: "Heebo_500Medium",
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    textAlign: "right",
    fontFamily: "Heebo_500Medium",
    marginBottom: 10,
  },
  offline: {
    backgroundColor: colors.dangerBg,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    textAlign: "center",
    color: colors.danger,
    fontFamily: "Heebo_600SemiBold",
  },
});

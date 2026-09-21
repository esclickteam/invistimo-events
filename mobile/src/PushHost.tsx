import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import {
  Notifications,
  consumePendingPushScreen,
  getPushPreference,
  registerNativePush,
  rememberPushScreen,
} from "@/src/push";
import { pathForPushScreen } from "@/src/pushRoutes";

export function PushHost() {
  const { ready, locked, user } = useAuth();

  useEffect(() => {
    if (!ready || locked || !user) return;
    void (async () => {
      const enabled = await getPushPreference();
      if (enabled) await registerNativePush(true);
    })();
  }, [ready, locked, user?._id]);

  useEffect(() => {
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification.request.content.data?.screen) {
      rememberPushScreen(last.notification.request.content.data.screen);
    }

    const received = Notifications.addNotificationReceivedListener(() => undefined);
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      rememberPushScreen(response.notification.request.content.data?.screen);
      if (!locked && user) {
        const screen = consumePendingPushScreen();
        if (screen) router.push(pathForPushScreen(screen) as never);
      }
    });

    return () => {
      received.remove();
      tapped.remove();
    };
  }, [locked, user]);

  useEffect(() => {
    if (!user || locked) return;
    const screen = consumePendingPushScreen();
    if (screen) router.push(pathForPushScreen(screen) as never);
  }, [user, locked]);

  return null;
}

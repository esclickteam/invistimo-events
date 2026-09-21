import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { api } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import { Card, EmptyState, ErrorText, Page } from "@/src/ui";
import { colors } from "@/src/theme";

type RouteItem = {
  _id?: string;
  name?: string;
  direction?: string;
  departureTime?: string;
  stops?: unknown[];
};

export default function TransportScreen() {
  const { invitation, event } = useEventData();
  const eventId = String(invitation?.eventId || event?._id || "");
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    void api<{ success?: boolean; routes?: RouteItem[]; message?: string; error?: string }>(
      `/api/events/${eventId}/transportation/routes`
    ).then((result) => {
      if (!result.ok) {
        setError(messageFromApi(result.data, "ניהול הסעות לא זמין בחשבון הזה"));
        return;
      }
      setRoutes(result.data.routes || []);
    });
  }, [eventId]);

  return (
    <Page>
      <ErrorText text={error} />
      {!routes.length && !error ? <EmptyState text="אין מסלולי הסעה שמורים." /> : null}
      {routes.map((route) => (
        <Card key={route._id || route.name}>
          <Text style={styles.title}>{route.name || "מסלול"}</Text>
          <Text style={styles.meta}>
            {[route.direction, route.departureTime, route.stops ? `${route.stops.length} תחנות` : ""]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Card>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, fontFamily: "Heebo_400Regular", marginTop: 4 },
});

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { api } from "@/src/api";
import { useVenueHall } from "@/src/venueHall";
import { Card, EmptyState, ErrorText, Page } from "@/src/ui";
import { colors } from "@/src/theme";
import { messageFromApi } from "@/src/format";

type VenueRow = {
  venueId?: string;
  hallId?: string;
  name?: string;
  subtitle?: string;
  role?: string;
  permissions?: string[];
};

export default function VenuePicker() {
  const { setHall } = useVenueHall();
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api<{ venues?: VenueRow[] }>("/api/venues/dashboard/my-venues").then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(messageFromApi(result.data, "אין גישה לאולמות"));
        return;
      }
      setVenues(result.data.venues || []);
    });
  }, []);

  return (
    <Page refreshing={loading}>
      <Text style={styles.title}>בחירת אולם / סקירה</Text>
      <ErrorText text={error} />
      {!venues.length && !loading ? <EmptyState text="אין אולמות משויכים." /> : null}
      {venues.map((venue) => {
        const hallId = String(venue.venueId || venue.hallId || "");
        return (
          <Pressable
            key={hallId}
            onPress={() => {
              setHall({
                hallId,
                name: venue.name || "",
                role: venue.role || "",
                permissions: venue.permissions || [],
              });
              router.push(`/(venue)/halls/${hallId}` as never);
            }}
          >
            <Card>
              <Text style={styles.name}>{venue.name || "אולם"}</Text>
              <Text style={styles.meta}>{[venue.subtitle, venue.role].filter(Boolean).join(" · ")}</Text>
            </Card>
          </Pressable>
        );
      })}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 24, color: colors.brownText, marginBottom: 12 },
  name: { textAlign: "right", fontFamily: "Heebo_700Bold", color: colors.brownText },
  meta: { textAlign: "right", color: colors.muted, marginTop: 4 },
});

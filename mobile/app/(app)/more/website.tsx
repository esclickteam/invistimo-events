import { useEffect, useState } from "react";
import { Share, StyleSheet, Text } from "react-native";
import { api, API_URL } from "@/src/api";
import { useEventData } from "@/src/event";
import { messageFromApi } from "@/src/format";
import { Card, EmptyState, ErrorText, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

export default function WebsiteScreen() {
  const { invitation } = useEventData();
  const [published, setPublished] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const shareId = invitation?.shareId;
  const url = shareId ? `${API_URL}/w/${shareId}` : "";

  useEffect(() => {
    const params = invitation?._id ? `?invitationId=${invitation._id}` : "";
    void api<{ success?: boolean; website?: { published?: boolean }; message?: string; error?: string }>(
      `/api/wedding-website${params}`
    ).then((result) => {
      if (!result.ok) {
        setError(messageFromApi(result.data, "אתר החתונה לא זמין בחשבון"));
        return;
      }
      setPublished(Boolean(result.data.website?.published));
    });
  }, [invitation?._id]);

  if (error) {
    return (
      <Page>
        <ErrorText text={error} />
      </Page>
    );
  }

  return (
    <Page>
      <Card>
        <Text style={styles.title}>{published ? "האתר פורסם" : "האתר עדיין לא פורסם"}</Text>
        <Text style={styles.meta}>
          עורך אתר החתונה הוויזואלי נשאר באתר. הסטטוס והקישור כאן מגיעים מאותו תוכן.
        </Text>
        {url ? <Text style={styles.link}>{url}</Text> : null}
      </Card>
      {!shareId ? <EmptyState text="אין עדיין קישור לאתר." /> : null}
      {url ? <PrimaryButton label="שיתוף אתר החתונה" onPress={() => void Share.share({ message: url })} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 18, color: colors.brownText },
  meta: { textAlign: "right", marginTop: 8, color: colors.muted, fontFamily: "Heebo_400Regular", lineHeight: 22 },
  link: { textAlign: "right", marginTop: 10, color: colors.gold, fontFamily: "Heebo_500Medium" },
});

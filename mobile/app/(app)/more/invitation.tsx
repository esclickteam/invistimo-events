import { Share, StyleSheet, Text } from "react-native";
import { API_URL } from "@/src/api";
import { useEventData } from "@/src/event";
import { Card, EmptyState, Page, PrimaryButton } from "@/src/ui";
import { colors } from "@/src/theme";

export default function InvitationScreen() {
  const { invitation } = useEventData();
  if (!invitation) {
    return (
      <Page>
        <EmptyState text="עדיין אין הזמנה לאירוע." />
      </Page>
    );
  }

  const shareId = invitation.shareId;
  const mode = String(
    invitation.invitationSettings?.rsvpSiteMode ||
      invitation.invitationSettings?.guestExperienceType ||
      invitation.rsvpSiteMode ||
      invitation.guestExperienceType ||
      ""
  );
  const personal = mode === "personal" || mode === "wedding_website";
  const url = shareId ? `${API_URL}${personal ? `/w/${shareId}` : `/invite/${shareId}`}` : "";

  return (
    <Page>
      <Card>
        <Text style={styles.title}>{String(invitation.title || "הזמנה")}</Text>
        <Text style={styles.meta}>
          עורך הקנבס המלא של ההזמנה נשאר באתר. כאן אפשר לראות את פרטי ההזמנה ולשתף את הקישור לאורחים.
        </Text>
        {url ? <Text style={styles.link}>{url}</Text> : null}
      </Card>
      {url ? (
        <PrimaryButton
          label="שיתוף קישור ההזמנה"
          onPress={() => void Share.share({ message: url })}
        />
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "right", fontFamily: "Heebo_700Bold", fontSize: 20, color: colors.brownText },
  meta: { textAlign: "right", marginTop: 8, color: colors.muted, fontFamily: "Heebo_400Regular", lineHeight: 22 },
  link: { textAlign: "right", marginTop: 12, color: colors.gold, fontFamily: "Heebo_500Medium" },
});

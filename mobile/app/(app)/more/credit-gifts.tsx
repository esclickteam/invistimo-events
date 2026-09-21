import { Linking } from "react-native";
import { Page, PrimaryButton, ScreenTitle } from "@/src/ui";

export default function CreditGiftsScreen() {
  return (
    <Page>
      <ScreenTitle title="קישור למתנות באשראי" subtitle="השירות החיצוני הקיים באתר" />
      <PrimaryButton
        label="פתיחת קישור המתנות"
        onPress={() => void Linking.openURL("https://ktzr.io/giftInvistimoSignup")}
      />
    </Page>
  );
}

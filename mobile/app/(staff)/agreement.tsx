import { openOnWebsite } from "@/src/website";
import { Page, PrimaryButton, ScreenTitle } from "@/src/ui";

export default function StaffAgreement() {
  return (
    <Page>
      <ScreenTitle title="חתימת הסכם" subtitle="חתימה על הסכם העובד" />
      <PrimaryButton label="פתיחת הסכם לחתימה" onPress={() => void openOnWebsite("/employee/agreement/sign")} />
    </Page>
  );
}

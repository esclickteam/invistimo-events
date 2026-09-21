import { openOnWebsite } from "@/src/website";
import { Page, PrimaryButton, ScreenTitle } from "@/src/ui";

export default function StaffForm101() {
  return (
    <Page>
      <ScreenTitle title="טופס 101" subtitle="מילוי טופס 101" />
      <PrimaryButton label="פתיחת טופס 101" onPress={() => void openOnWebsite("/employee/form101")} />
    </Page>
  );
}

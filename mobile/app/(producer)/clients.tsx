import { RecordsScreen } from "@/src/records";
import { openOnWebsite } from "@/src/website";
import { OutlineButton } from "@/src/ui";

export default function ProducerClients() {
  return (
    <>
      <OutlineButton label="יצירת לקוח באתר" onPress={() => void openOnWebsite("/producer/dashboard")} />
      <RecordsScreen
        title="לקוחות"
        path="/api/producer/clients"
        metaKeys={["email", "phone", "eventDate", "packageName"]}
      />
    </>
  );
}

import { RecordsScreen } from "@/src/records";
import { router } from "expo-router";
import { OutlineButton, Page } from "@/src/ui";

export default function StaffSales() {
  return (
    <Page>
      <OutlineButton label="יצירת לקוח חדש ותשלום" onPress={() => router.push("/(staff)/sales/new")} />
      <RecordsScreen
        title="המכירות שלי"
        path="/api/employee/sales"
        metaKeys={["clientName", "email", "packageName", "status", "amount"]}
      />
    </Page>
  );
}

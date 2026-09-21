import { useLocalSearchParams } from "expo-router";
import { RecordDetailScreen } from "@/src/records";
import { openOnWebsite } from "@/src/website";

export default function AdminCustomerFile() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  return (
    <RecordDetailScreen
      path={`/api/admin/customers/${customerId}`}
      fields={[
        { key: "fullName", label: "שם" },
        { key: "email", label: "אימייל" },
        { key: "phone", label: "טלפון" },
        { key: "packageName", label: "חבילה" },
        { key: "status", label: "סטטוס" },
        { key: "paidAmount", label: "שולם" },
        { key: "balance", label: "יתרה" },
        { key: "venueName", label: "אולם" },
        { key: "leadStatus", label: "סטטוס ליד" },
      ]}
      actions={[
        {
          label: "המשך באתר",
          onPress: () => void openOnWebsite(`/admin/customers/${customerId}`),
        },
      ]}
    />
  );
}

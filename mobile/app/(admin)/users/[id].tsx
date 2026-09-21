import { useLocalSearchParams } from "expo-router";
import { RecordDetailScreen } from "@/src/records";
import { openOnWebsite } from "@/src/website";

export default function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RecordDetailScreen
      path={`/api/admin/users/${id}`}
      fields={[
        { key: "name", label: "שם" },
        { key: "email", label: "אימייל" },
        { key: "phone", label: "טלפון" },
        { key: "role", label: "תפקיד" },
        { key: "packageName", label: "חבילה" },
        { key: "hasPaid", label: "שולם" },
        { key: "includeCalls", label: "שיחות" },
        { key: "includeDigitalSeating", label: "הושבה" },
      ]}
      actions={[
        {
          label: "התחזות באתר",
          onPress: () => void openOnWebsite("/admin/users"),
        },
      ]}
    />
  );
}

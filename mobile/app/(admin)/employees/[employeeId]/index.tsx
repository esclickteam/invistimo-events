import { useLocalSearchParams, router } from "expo-router";
import { RecordDetailScreen } from "@/src/records";

export default function AdminEmployeeFile() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  return (
    <RecordDetailScreen
      path={`/api/admin/employees/${employeeId}/profile`}
      fields={[
        { key: "name", label: "שם" },
        { key: "fullName", label: "שם מלא" },
        { key: "email", label: "אימייל" },
        { key: "phone", label: "טלפון" },
        { key: "role", label: "תפקיד" },
        { key: "staffType", label: "סוג עובד" },
      ]}
      actions={[
        { label: "דוח שעות", onPress: () => router.push(`/(admin)/employees/${employeeId}/hours` as never) },
        { label: "מכירות עובד", onPress: () => router.push(`/(admin)/employees/${employeeId}/sales` as never) },
      ]}
    />
  );
}

import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function AdminEmployeeSales() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  return (
    <RecordsScreen
      title="מכירות עובד"
      path={`/api/admin/employees/${employeeId}/sales`}
      metaKeys={["email", "packageName", "status", "amount", "createdAt"]}
    />
  );
}

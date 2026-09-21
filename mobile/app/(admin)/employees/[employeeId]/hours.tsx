import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function AdminEmployeeHours() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  return (
    <RecordsScreen
      title="דוח שעות"
      path={`/api/admin/employees/${employeeId}/hours`}
      metaKeys={["date", "hours", "location", "type"]}
    />
  );
}

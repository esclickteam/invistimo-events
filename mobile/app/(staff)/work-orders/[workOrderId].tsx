import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function WorkOrderTasks() {
  const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();
  return (
    <RecordsScreen
      title="רשימת שיחות"
      path={`/api/employee/work-orders/${workOrderId}/tasks`}
      metaKeys={["guestName", "phone", "status", "rsvp", "tableName"]}
    />
  );
}

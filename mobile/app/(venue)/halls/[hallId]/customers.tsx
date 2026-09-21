import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallCustomers() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="לקוחות"
      path={`/api/venues/dashboard/halls/${hallId}/customers`}
      metaKeys={["phone", "email", "eventDate", "status"]}
    />
  );
}

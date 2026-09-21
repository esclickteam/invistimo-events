import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallStaff() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="צוות / משמרות"
      path={`/api/venues/dashboard/halls/${hallId}/staff`}
      metaKeys={["role", "shift", "phone"]}
    />
  );
}

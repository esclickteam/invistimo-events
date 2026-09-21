import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallActivity() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="יומן פעילות"
      path={`/api/venues/dashboard/halls/${hallId}/activity`}
      metaKeys={["actor", "action", "createdAt"]}
    />
  );
}

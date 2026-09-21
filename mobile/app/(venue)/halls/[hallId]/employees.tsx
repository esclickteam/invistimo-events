import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallEmployees() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="עובדים והרשאות"
      path={`/api/venues/dashboard/halls/${hallId}/employees`}
      metaKeys={["email", "role", "permissions"]}
    />
  );
}

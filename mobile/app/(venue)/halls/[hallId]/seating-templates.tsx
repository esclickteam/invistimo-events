import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallSeatingTemplates() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="הושבה"
      path={`/api/venues/dashboard/seating-templates?hallId=${hallId}`}
      metaKeys={["tablesCount", "updatedAt"]}
    />
  );
}

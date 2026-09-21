import { useLocalSearchParams } from "expo-router";
import { RecordDetailScreen } from "@/src/records";

export default function HallDayOf() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordDetailScreen
      path={`/api/venues/dashboard/halls/${hallId}/day-of`}
      fields={[
        { key: "eventName", label: "אירוע" },
        { key: "arrivals", label: "הגעות" },
        { key: "expected", label: "צפויים" },
        { key: "status", label: "סטטוס" },
      ]}
    />
  );
}

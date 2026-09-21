import { useLocalSearchParams } from "expo-router";
import { RecordDetailScreen } from "@/src/records";

export default function HallReports() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordDetailScreen
      path={`/api/venues/dashboard/halls/${hallId}/reports`}
      fields={[
        { key: "leads", label: "לידים" },
        { key: "conversion", label: "המרה" },
        { key: "revenue", label: "הכנסות" },
      ]}
    />
  );
}

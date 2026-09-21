import { useLocalSearchParams } from "expo-router";
import { RecordDetailScreen } from "@/src/records";

export default function HallOverview() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordDetailScreen
      path={`/api/venues/dashboard/halls/${hallId}`}
      fields={[
        { key: "name", label: "שם אולם" },
        { key: "address", label: "כתובת" },
        { key: "phone", label: "טלפון" },
        { key: "todayEvents", label: "אירועים היום" },
        { key: "upcomingEvents", label: "קרובים" },
      ]}
    />
  );
}

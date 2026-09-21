import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallCalendar() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="אירועים / יומן"
      path={`/api/venues/dashboard/halls/${hallId}/calendar`}
      metaKeys={["date", "status", "clientName", "packageName"]}
      hrefForItem={(item) => `/(venue)/events/${item._id || item.id}` as never}
    />
  );
}

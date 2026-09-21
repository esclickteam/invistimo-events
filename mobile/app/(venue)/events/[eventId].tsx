import { useLocalSearchParams } from "expo-router";
import { RecordDetailScreen } from "@/src/records";

export default function VenueEvent() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  return (
    <RecordDetailScreen
      path={`/api/venues/dashboard/events/${eventId}`}
      fields={[
        { key: "title", label: "אירוע" },
        { key: "date", label: "תאריך" },
        { key: "clientName", label: "לקוח" },
        { key: "status", label: "סטטוס" },
        { key: "guestCount", label: "מוזמנים" },
      ]}
    />
  );
}

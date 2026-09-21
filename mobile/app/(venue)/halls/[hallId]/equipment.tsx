import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallEquipment() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="ציוד"
      path={`/api/venues/dashboard/halls/${hallId}/equipment`}
      metaKeys={["status", "assignedTo", "quantity"]}
    />
  );
}

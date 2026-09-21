import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallCrm() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="לידים"
      path={`/api/venues/dashboard/halls/${hallId}/crm`}
      metaKeys={["phone", "email", "status", "source"]}
    />
  );
}

import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallFiles() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="קבצים / חוזים"
      path={`/api/venues/dashboard/halls/${hallId}/files`}
      metaKeys={["type", "createdAt", "size"]}
    />
  );
}

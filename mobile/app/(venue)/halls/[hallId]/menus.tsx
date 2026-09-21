import { useLocalSearchParams } from "expo-router";
import { RecordsScreen } from "@/src/records";

export default function HallMenus() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordsScreen
      title="תפריטים"
      path={`/api/venues/dashboard/halls/${hallId}/menus`}
      metaKeys={["price", "status", "type"]}
    />
  );
}

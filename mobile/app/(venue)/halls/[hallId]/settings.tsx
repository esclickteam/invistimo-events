import { useLocalSearchParams } from "expo-router";
import { RecordDetailScreen } from "@/src/records";
import { openOnWebsite } from "@/src/website";

export default function HallSettings() {
  const { hallId } = useLocalSearchParams<{ hallId: string }>();
  return (
    <RecordDetailScreen
      path={`/api/venues/dashboard/halls/${hallId}/settings`}
      fields={[
        { key: "name", label: "שם" },
        { key: "address", label: "כתובת" },
        { key: "phone", label: "טלפון" },
      ]}
      actions={[
        {
          label: "עריכה באתר",
          onPress: () => void openOnWebsite(`/venues/dashboard/halls/${hallId}/settings`),
        },
      ]}
    />
  );
}

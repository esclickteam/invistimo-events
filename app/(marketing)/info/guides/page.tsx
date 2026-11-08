import { permanentRedirect } from "next/navigation";

export default function GuidesHubRedirect() {
  permanentRedirect("/blog");
}

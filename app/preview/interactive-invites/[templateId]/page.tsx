import { redirect, notFound } from "next/navigation";
import { isInteractiveWeddingThemeId } from "@/config/weddingWebsite/interactiveThemes";

type Props = {
  params: Promise<{ templateId: string }>;
};

/** Legacy preview URLs redirect into the real wedding-website template demos (no chrome). */
export default async function InteractiveInviteTemplatePage({ params }: Props) {
  const { templateId } = await params;
  if (!isInteractiveWeddingThemeId(templateId)) notFound();
  redirect(`/wedding-website/${templateId}`);
}

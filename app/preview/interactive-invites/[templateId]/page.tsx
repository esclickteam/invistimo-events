import { notFound } from "next/navigation";
import InteractiveInviteSite from "@/components/interactive-invites/InteractiveInviteSite";
import {
  INTERACTIVE_INVITE_TEMPLATES,
  getInteractiveInviteTemplate,
  isInteractiveInviteTemplateId,
} from "@/config/interactiveInvites/templates";
import { DEMO_EVENTS } from "@/config/interactiveInvites/demoEvents";

type Props = {
  params: Promise<{ templateId: string }>;
};

export function generateStaticParams() {
  return INTERACTIVE_INVITE_TEMPLATES.map((t) => ({ templateId: t.id }));
}

export async function generateMetadata({ params }: Props) {
  const { templateId } = await params;
  const template = getInteractiveInviteTemplate(templateId);
  if (!template) return { title: "תבנית לא נמצאה", robots: { index: false } };
  const event = DEMO_EVENTS[template.id];
  return {
    title: `${template.nameHe} · ${event.coupleNames} | INVISTIMO Preview`,
    description: template.description,
    robots: { index: false, follow: false },
  };
}

export default async function InteractiveInviteTemplatePage({ params }: Props) {
  const { templateId } = await params;
  if (!isInteractiveInviteTemplateId(templateId)) notFound();
  return <InteractiveInviteSite templateId={templateId} />;
}

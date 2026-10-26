"use client";

import { useMemo, useState } from "react";
import type { InteractiveInviteTemplateId } from "@/types/interactiveInvite";
import { getInteractiveInviteTemplate } from "@/config/interactiveInvites/templates";
import { DEMO_EVENTS } from "@/config/interactiveInvites/demoEvents";
import { INTERACTIVE_INVITE_MUSIC } from "@/config/interactiveInvites/musicLibrary";
import EnvelopeOpening from "./envelopes/EnvelopeOpening";
import SmoothScroll from "./engine/SmoothScroll";
import ScrollMotion from "./engine/ScrollMotion";
import MusicController from "./engine/MusicController";
import {
  CountdownSection,
  FaqSection,
  FooterSection,
  GallerySection,
  HeroSection,
  InviteNav,
  LocationSection,
  RsvpSection,
  ScheduleSection,
  StorySection,
  themeToCssVars,
} from "./sections/InviteSections";
import TemplateAtmosphere from "./templates/TemplateAtmospheres";
import "./interactive-invites.css";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Alef:wght@400;700&family=Assistant:wght@300;400;600;700&family=Caveat:wght@400;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Frank+Ruhl+Libre:wght@400;500;700&family=Great+Vibes&family=Heebo:wght@300;400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Noto+Serif+Hebrew:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Rubik:wght@300;400;500;600&display=swap";

export default function InteractiveInviteSite({
  templateId,
}: {
  templateId: InteractiveInviteTemplateId;
}) {
  const template = getInteractiveInviteTemplate(templateId)!;
  const event = DEMO_EVENTS[templateId];
  const [opened, setOpened] = useState(false);
  const [musicToken, setMusicToken] = useState(0);

  const cssVars = useMemo(() => themeToCssVars(template.theme), [template.theme]);

  const onOpened = () => {
    setOpened(true);
    setMusicToken((n) => n + 1);
  };

  return (
    <div className="ii-root ii-desktop-frame" style={cssVars} dir="rtl" lang="he">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONT_HREF} />

      {!opened && (
        <EnvelopeOpening
          variant={template.envelope}
          monogram={event.monogram}
          dateLabel={event.weddingDateLabel}
          coupleNames={event.coupleNames}
          onOpened={onOpened}
        />
      )}

      <SmoothScroll enabled={opened}>
        <ScrollMotion style={template.motion} enabled={opened}>
          <div className="ii-stage ii-grain relative" data-template={template.id}>
            {opened && (
              <>
                <TemplateAtmosphere id={template.id} />
                <InviteNav />
                <HeroSection event={event} motion={template.motion} />
                <CountdownSection event={event} />
                <StorySection event={event} />
                <GallerySection event={event} motion={template.motion} />
                <ScheduleSection event={event} />
                <LocationSection event={event} />
                <RsvpSection event={event} />
                <FaqSection event={event} />
                <FooterSection event={event} />
                <MusicController
                  tracks={INTERACTIVE_INVITE_MUSIC}
                  defaultTrackId={template.defaultMusicId}
                  accent={template.theme.accent}
                  ink={template.theme.ink}
                  paper={template.theme.paper}
                  autoStartToken={musicToken}
                />
              </>
            )}
          </div>
        </ScrollMotion>
      </SmoothScroll>

      <a
        href="/preview/interactive-invites"
        className="fixed top-4 end-4 z-[90] rounded-full border px-3 py-1.5 text-xs backdrop-blur-md"
        style={{
          background: "color-mix(in srgb, var(--ii-paper) 92%, white)",
          borderColor: "color-mix(in srgb, var(--ii-accent) 40%, transparent)",
          color: "var(--ii-ink)",
          pointerEvents: "auto",
        }}
      >
        ← לגלריה
      </a>
    </div>
  );
}

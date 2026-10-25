"use client";

import {
  DEMO_COUPLE,
  type InvitationDesignId,
} from "@/components/marketing/invitations/designs";

type Props = {
  id: InvitationDesignId;
  compact?: boolean;
  animated?: boolean;
  className?: string;
};

function Frame({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <article
      dir="rtl"
      className={`relative flex aspect-[3/4.6] w-full flex-col overflow-hidden text-center ${className}`}
      style={style}
      aria-label={`המחשת הזמנה בסגנון ${DEMO_COUPLE.bride} ו${DEMO_COUPLE.groom}`}
    >
      {children}
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-[8px] font-medium tracking-wide opacity-50 sm:text-[9px]">
        {DEMO_COUPLE.disclaimer}
      </p>
    </article>
  );
}

function Names({
  className = "",
  ampersandClass = "",
}: {
  className?: string;
  ampersandClass?: string;
}) {
  return (
    <h3 className={`leading-none ${className}`}>
      <span className="block">{DEMO_COUPLE.bride}</span>
      <span className={`my-1 block text-[0.55em] font-light ${ampersandClass}`}>&</span>
      <span className="block">{DEMO_COUPLE.groom}</span>
    </h3>
  );
}

function Details({
  className = "",
  mutedClass = "",
}: {
  className?: string;
  mutedClass?: string;
}) {
  return (
    <div className={`space-y-1.5 text-[0.62rem] leading-relaxed sm:text-[0.7rem] ${className}`}>
      <p className="font-semibold tracking-wide">
        {DEMO_COUPLE.weekday} <span className={mutedClass}>|</span> {DEMO_COUPLE.date}
      </p>
      <p className="font-medium">{DEMO_COUPLE.venue}</p>
      <p className={`text-[0.9em] ${mutedClass}`}>{DEMO_COUPLE.address}</p>
      <div className="mx-auto flex max-w-[90%] items-center justify-center gap-3 pt-1">
        <div>
          <p className={`text-[0.75em] uppercase tracking-[0.18em] ${mutedClass}`}>קבלת פנים</p>
          <p className="font-semibold tabular-nums">{DEMO_COUPLE.reception}</p>
        </div>
        <span className={`h-6 w-px ${mutedClass.includes("text-") ? "bg-current opacity-30" : "bg-[#C9A962]/50"}`} />
        <div>
          <p className={`text-[0.75em] uppercase tracking-[0.18em] ${mutedClass}`}>חופה</p>
          <p className="font-semibold tabular-nums">{DEMO_COUPLE.chuppah}</p>
        </div>
      </div>
    </div>
  );
}

function ClassicIvory({ compact }: { compact?: boolean }) {
  return (
    <Frame className="bg-[#F7F1E6] text-[#2C241C] shadow-[inset_0_0_0_1px_rgba(201,169,98,0.35)]">
      <div className="absolute inset-3 border border-[#C9A962]/45 sm:inset-4" />
      <div className="absolute inset-4 border border-[#C9A962]/20 sm:inset-5" />
      <div className={`relative z-10 flex h-full flex-col items-center justify-between px-5 py-8 sm:px-7 ${compact ? "py-6" : "py-10"}`}>
        <p className="text-[0.55rem] font-semibold tracking-[0.35em] text-[#A77A38] sm:text-[0.65rem]">
          THE WEDDING OF
        </p>
        <Names className="font-[family-name:var(--font-invite-display)] text-[1.85rem] font-medium sm:text-[2.35rem]" ampersandClass="text-[#C9A962]" />
        <p className="max-w-[16ch] whitespace-pre-line text-[0.62rem] leading-relaxed text-[#5C4A38] sm:text-[0.72rem]">
          {DEMO_COUPLE.opener}
        </p>
        <Details mutedClass="text-[#8A7458]" />
        <div className="grid w-full grid-cols-2 gap-2 border-t border-[#C9A962]/25 pt-3 text-[0.55rem] text-[#5C4A38] sm:text-[0.62rem]">
          <div>
            <p className="mb-0.5 text-[0.7em] tracking-wide text-[#A77A38]">הורי הכלה</p>
            <p>{DEMO_COUPLE.brideParents}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[0.7em] tracking-wide text-[#A77A38]">הורי החתן</p>
            <p>{DEMO_COUPLE.groomParents}</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function SilkChampagne({ animated }: { animated?: boolean }) {
  return (
    <Frame
      className="bg-gradient-to-b from-[#F8ECD8] via-[#F0D9B4] to-[#E4C496] text-[#3A2E22]"
      style={{
        backgroundImage:
          "linear-gradient(165deg,#F8ECD8 0%,#F3E0C0 42%,#E8CFA0 70%,#D9B888 100%)",
      }}
    >
      <div
        className={`absolute -left-8 top-1/3 h-40 w-[140%] rotate-[-18deg] bg-gradient-to-r from-transparent via-white/50 to-transparent ${
          animated ? "invite-satin-sweep" : "opacity-40"
        }`}
      />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
        <div className="h-px w-16 bg-[#A67C3D]/70" />
        <Names
          className={`font-[family-name:var(--font-invite-display)] text-[2rem] font-medium text-[#3A2E22] sm:text-[2.45rem] ${
            animated ? "invite-fade-up" : ""
          }`}
          ampersandClass="text-[#A67C3D]"
        />
        <p className="text-[0.65rem] tracking-[0.22em] text-[#7A5A32]">CHAMPAGNE EVENING</p>
        <Details className="text-[#4A3828]" mutedClass="text-[#8A6A42]" />
        <div className="h-px w-16 bg-[#A67C3D]/70" />
      </div>
    </Frame>
  );
}

function BotanicalElegance({ animated }: { animated?: boolean }) {
  return (
    <Frame className="bg-[#F8F5EE] text-[#2F3329]">
      <svg
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 w-full text-[#7A8F6A] ${
          animated ? "invite-bloom" : "opacity-80"
        }`}
        viewBox="0 0 300 90"
        fill="none"
        aria-hidden
      >
        <path d="M20 70 C60 10, 100 10, 150 45 C200 10, 240 10, 280 70" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        <circle cx="70" cy="28" r="7" fill="#F5F2EA" stroke="currentColor" strokeWidth="1" />
        <circle cx="150" cy="18" r="9" fill="#F5F2EA" stroke="currentColor" strokeWidth="1" />
        <circle cx="230" cy="28" r="7" fill="#F5F2EA" stroke="currentColor" strokeWidth="1" />
        <path d="M55 45 Q70 35 85 48" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <path d="M215 45 Q230 35 245 48" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      </svg>
      <svg
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full rotate-180 text-[#7A8F6A] ${
          animated ? "invite-bloom delay-200" : "opacity-80"
        }`}
        viewBox="0 0 300 90"
        fill="none"
        aria-hidden
      >
        <path d="M20 70 C60 10, 100 10, 150 45 C200 10, 240 10, 280 70" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        <circle cx="70" cy="28" r="7" fill="#F5F2EA" stroke="currentColor" strokeWidth="1" />
        <circle cx="150" cy="18" r="9" fill="#F5F2EA" stroke="currentColor" strokeWidth="1" />
        <circle cx="230" cy="28" r="7" fill="#F5F2EA" stroke="currentColor" strokeWidth="1" />
      </svg>
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 py-16">
        <p className="text-[0.55rem] tracking-[0.3em] text-[#7A8F6A]">GARDEN CELEBRATION</p>
        <Names className="font-[family-name:var(--font-invite-display)] text-[1.9rem] font-medium sm:text-[2.3rem]" ampersandClass="text-[#7A8F6A]" />
        <Details mutedClass="text-[#6B7A62]" />
      </div>
    </Frame>
  );
}

function ModernEditorial() {
  return (
    <Frame className="bg-[#FAFAF7] text-[#1A1A1A]">
      <div className="flex h-full flex-col justify-between px-5 py-7 text-right sm:px-6 sm:py-9">
        <div>
          <p className="text-[0.55rem] font-semibold uppercase tracking-[0.4em] text-[#8A7A62]">Invitation</p>
          <h3 className="mt-6 font-[family-name:var(--font-invite-display)] text-[2.6rem] font-medium leading-[0.95] sm:text-[3.1rem]">
            {DEMO_COUPLE.bride}
            <span className="mt-1 block text-[#8A7A62]">&amp; {DEMO_COUPLE.groom}</span>
          </h3>
        </div>
        <div className="space-y-3 border-t border-[#1A1A1A] pt-4 text-[0.7rem] leading-relaxed">
          <p className="max-w-[22ch] whitespace-pre-line text-[#444]">{DEMO_COUPLE.opener}</p>
          <p className="text-base font-semibold tracking-wide">
            {DEMO_COUPLE.weekday} · {DEMO_COUPLE.date}
          </p>
          <p>{DEMO_COUPLE.venue}</p>
          <p className="text-[#666]">{DEMO_COUPLE.address}</p>
          <p className="pt-1 tabular-nums text-[#444]">
            קבלת פנים {DEMO_COUPLE.reception} · חופה {DEMO_COUPLE.chuppah}
          </p>
        </div>
      </div>
    </Frame>
  );
}

function PearlRomance() {
  return (
    <Frame
      className="text-[#2C2426]"
      style={{
        background:
          "radial-gradient(circle at 30% 20%, #FFF9F5 0%, #F4EEE8 45%, #E8D8D2 100%)",
      }}
    >
      <div className="absolute inset-5 rounded-[40%_60%_55%_45%/45%_40%_60%_55%] border border-[#C9A8AE]/35" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-7 py-12">
        <div className="h-1.5 w-1.5 rounded-full bg-[#8B4A55]/70" />
        <Names className="font-[family-name:var(--font-invite-display)] text-[1.95rem] font-medium text-[#3A2A2E] sm:text-[2.4rem]" ampersandClass="text-[#8B4A55]" />
        <p className="max-w-[18ch] whitespace-pre-line text-[0.62rem] leading-relaxed text-[#6A5056]">
          {DEMO_COUPLE.opener}
        </p>
        <Details mutedClass="text-[#8B6A70]" />
        <p className="pt-2 text-[0.58rem] tracking-[0.2em] text-[#8B4A55]">WITH LOVE</p>
      </div>
    </Frame>
  );
}

function MidnightLuxury({ animated }: { animated?: boolean }) {
  return (
    <Frame className="bg-[#14110F] text-[#F3E7D2]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2A221C_0%,transparent_55%)]" />
      <div className="absolute inset-3 border border-[#C9A962]/35 sm:inset-4" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
        <p className="text-[0.55rem] tracking-[0.38em] text-[#C9A962]">MIDNIGHT</p>
        <Names
          className={`font-[family-name:var(--font-invite-display)] text-[2rem] font-medium sm:text-[2.5rem] ${
            animated ? "invite-gold-glow" : ""
          }`}
          ampersandClass="text-[#C9A962]"
        />
        <div className="h-px w-20 bg-gradient-to-l from-transparent via-[#C9A962] to-transparent" />
        <Details className="text-[#E8D9C0]" mutedClass="text-[#C9A962]/80" />
        <p className="text-[0.58rem] tracking-[0.25em] text-[#C9A962]/90">AN EVENING TO REMEMBER</p>
      </div>
    </Frame>
  );
}

function OliveGarden() {
  return (
    <Frame className="bg-[#F3EFE4] text-[#2C2A20]">
      <div className="absolute inset-y-0 left-0 w-2 bg-[#6B7348]/80" />
      <div className="absolute inset-y-0 right-0 w-2 bg-[#6B7348]/80" />
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-7 py-9">
        <p className="text-[0.55rem] tracking-[0.28em] text-[#6B7348]">OLIVE &amp; CREAM</p>
        <div className="space-y-4">
          <Names className="font-[family-name:var(--font-invite-display)] text-[1.9rem] font-medium sm:text-[2.35rem]" ampersandClass="text-[#6B7348]" />
          <p className="mx-auto max-w-[18ch] whitespace-pre-line text-[0.62rem] leading-relaxed text-[#4A4A38]">
            {DEMO_COUPLE.opener}
          </p>
        </div>
        <Details mutedClass="text-[#6B7348]" />
        <div className="grid w-full grid-cols-2 gap-2 text-[0.55rem] text-[#4A4A38]">
          <p>
            <span className="block text-[#6B7348]">הורי הכלה</span>
            {DEMO_COUPLE.brideParents}
          </p>
          <p>
            <span className="block text-[#6B7348]">הורי החתן</span>
            {DEMO_COUPLE.groomParents}
          </p>
        </div>
      </div>
    </Frame>
  );
}

function TimelessMonogram() {
  return (
    <Frame className="bg-[#F6F0E6] text-[#241E18]">
      <div className="absolute inset-4 border-2 border-[#8B6914]/35 sm:inset-5" />
      <div className="absolute inset-5 border border-[#8B6914]/20 sm:inset-6" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#8B6914]/50 bg-[#FBF6EE] sm:h-24 sm:w-24">
          <span className="font-[family-name:var(--font-invite-display)] text-2xl font-medium tracking-widest text-[#8B6914] sm:text-3xl">
            {DEMO_COUPLE.monogram}
          </span>
        </div>
        <Names className="font-[family-name:var(--font-invite-display)] text-[1.75rem] font-medium sm:text-[2.15rem]" ampersandClass="text-[#8B6914]" />
        <Details mutedClass="text-[#7A6548]" />
        <p className="max-w-[18ch] text-[0.6rem] leading-relaxed text-[#5C4A38]">{DEMO_COUPLE.closing}</p>
      </div>
    </Frame>
  );
}

export default function InvitationArt({ id, compact, animated, className = "" }: Props) {
  const body = (() => {
    switch (id) {
      case "classic-ivory":
        return <ClassicIvory compact={compact} />;
      case "silk-champagne":
        return <SilkChampagne animated={animated} />;
      case "botanical-elegance":
        return <BotanicalElegance animated={animated} />;
      case "modern-editorial":
        return <ModernEditorial />;
      case "pearl-romance":
        return <PearlRomance />;
      case "midnight-luxury":
        return <MidnightLuxury animated={animated} />;
      case "olive-garden":
        return <OliveGarden />;
      case "timeless-monogram":
        return <TimelessMonogram />;
      default:
        return <ClassicIvory />;
    }
  })();

  return <div className={className}>{body}</div>;
}

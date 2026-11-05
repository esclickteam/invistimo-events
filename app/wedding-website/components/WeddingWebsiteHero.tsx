import TrackedCtaLink from "@/components/seo/TrackedCtaLink";
import HeroDevices from "./HeroDevices";
import { weddingLiveFrameCss } from "./weddingLiveFrameCss";
import { wwPrimary, wwSecondary } from "./wwButtons";
import { WW_PATH } from "../content";

const HERO_IMAGE = "/marketing/luxury/editorial-ceremony.webp";
const HERO_IMAGE_MOBILE = "/marketing/luxury/editorial-ceremony-828.webp";

type Props = {
  templateId: string;
  name: string;
  desktopPoster: string;
  mobilePoster: string;
};

export default function WeddingWebsiteHero({
  templateId,
  name,
  desktopPoster,
  mobilePoster,
}: Props) {
  return (
    <header className="relative isolate overflow-hidden bg-[#2A0F1D]">
      <link
        rel="preload"
        as="image"
        href={HERO_IMAGE_MOBILE}
        fetchPriority="high"
        media="(max-width: 900px)"
      />
      <link
        rel="preload"
        as="image"
        href={HERO_IMAGE}
        fetchPriority="high"
        media="(min-width: 901px)"
      />
      <style>{`
        ${weddingLiveFrameCss}
        @media (prefers-reduced-motion: no-preference) {
          .ww-hero-phone { animation: ww-hero-float 7s ease-in-out infinite alternate; }
        }
        @keyframes ww-hero-float {
          from { transform: translateY(0); }
          to { transform: translateY(-12px); }
        }
      `}</style>
      <img
        src={HERO_IMAGE}
        srcSet={`${HERO_IMAGE_MOBILE} 828w, ${HERO_IMAGE} 1600w`}
        sizes="100vw"
        width={1600}
        height={1068}
        alt=""
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
      />
      <div className="absolute inset-0 bg-gradient-to-l from-[#2A0F1D]/80 via-[#2A0F1D]/35 to-[#2A0F1D]/10" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-end gap-8 px-5 pb-12 pt-6 md:px-8 md:pb-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:pt-10">
        <div className="bg-[#F5EEE8]/95 p-6 shadow-[0_24px_70px_rgba(42,15,29,0.28)] sm:p-8 md:p-10">
          <p className="text-sm font-black tracking-[0.18em] text-[#842B4C]">אתרי חתונה</p>
          <h1 className="mt-4 max-w-xl font-['Cormorant_Garamond'] text-[2.35rem] font-semibold leading-[1.08] text-[#42182F] sm:text-5xl md:text-[3.35rem]">
            הסיפור שלכם, באתר שמרגיש כמו החתונה.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#6B5360] md:text-lg">
            פרטי האירוע, תמונות, לוח זמנים וניווט — במקום אחד שהאורחים פותחים מהטלפון.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedCtaLink href="#gallery" className={wwPrimary} location={`hero_gallery:${WW_PATH}`}>
              גלו את העיצובים
            </TrackedCtaLink>
            <a href="#how" className={wwSecondary}>
              איך זה עובד?
            </a>
          </div>
        </div>

        <HeroDevices
          templateId={templateId}
          name={name}
          desktopPoster={desktopPoster}
          mobilePoster={mobilePoster}
        />
      </div>
    </header>
  );
}

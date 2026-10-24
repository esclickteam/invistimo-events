import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  variant?: "laptop" | "phone";
  /** cover crops to fill; contain shows the full asset (better for invitations). */
  fit?: "cover" | "contain";
  priority?: boolean;
  className?: string;
};

function guessFit(src: string, fit?: "cover" | "contain"): "cover" | "contain" {
  if (fit) return fit;
  // Invitation / Save the Date studio art should never be cropped in a tall phone chrome.
  if (src.includes("/marketing/invites/") || src.includes("invite-") || src.includes("save-the-date")) {
    return "contain";
  }
  return "cover";
}

/** Realistic device chrome around a product screenshot — no card wrapper. */
export default function DeviceFrame({
  src,
  alt,
  variant = "laptop",
  fit,
  priority,
  className = "",
}: Props) {
  const objectFit = guessFit(src, fit);

  if (variant === "phone") {
    return (
      <div className={`relative mx-auto w-full max-w-[260px] ${className}`}>
        <div
          className="absolute -inset-4 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(199,165,107,0.35),transparent_55%)] blur-2xl"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-[2rem] border-[10px] border-[#1C1612] bg-[#1C1612] shadow-[0_28px_60px_rgba(28,22,18,0.35)]">
          <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2" aria-hidden>
            <span className="h-1.5 w-16 rounded-full bg-[#2A211A]" />
          </div>
          <div
            className={`relative w-full ${
              objectFit === "contain" ? "aspect-[9/16] bg-[#FBF6EE]" : "aspect-[9/19.5] bg-[#1C1612]"
            }`}
          >
            <Image
              src={src}
              alt={alt}
              fill
              priority={priority}
              className={objectFit === "contain" ? "object-contain object-center p-1" : "object-cover object-top"}
              sizes="(max-width: 768px) 70vw, 260px"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(199,165,107,0.28),transparent_60%)] blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-[#2A211A]/15 bg-[#1C1612] shadow-[0_32px_70px_rgba(42,33,26,0.28)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#2A211A] px-3 py-2" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="mx-auto max-w-[45%] truncate rounded-full bg-white/20 px-3 py-0.5 text-center text-[10px] font-medium text-white/85">
            invistimo.com
          </span>
        </div>
        <div className="relative aspect-[16/10] w-full bg-[#111]">
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            className={objectFit === "contain" ? "object-contain object-top" : "object-cover object-top"}
            sizes="(max-width: 1024px) 100vw, 720px"
          />
        </div>
      </div>
    </div>
  );
}

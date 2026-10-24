type Props = {
  src: string;
  poster?: string;
  caption?: string;
  className?: string;
};

/** Marketing demo clip — controls on, muted by default, no autoplay audio. */
export default function DemoVideo({ src, poster, caption, className = "" }: Props) {
  return (
    <figure className={`w-full ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-[#D5DBE3]/50 bg-[#1C1612] shadow-[0_24px_50px_rgba(42,33,26,0.2)]">
        <video
          src={src}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          muted
          className="aspect-video w-full object-cover"
        >
          הדפדפן לא תומך בהצגת הסרטון.{" "}
          <a href={src} className="underline">
            הורדה
          </a>
        </video>
      </div>
      {caption ? <figcaption className="mt-3 text-sm font-semibold text-[#6B7583]">{caption}</figcaption> : null}
    </figure>
  );
}

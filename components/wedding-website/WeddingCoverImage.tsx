type Props = {
  src?: string;
  alt?: string;
  className?: string;
};

export default function WeddingCoverImage({ src, alt = "", className = "" }: Props) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full object-cover object-center ${className}`.trim()}
    />
  );
}

import Image from "next/image";
import Link from "next/link";
import { formatReadingTime } from "@/lib/blog/reading";
import type { BlogArticle } from "@/lib/blog/articles";

function Cover({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  if (src.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition duration-500 group-hover:scale-[1.04]"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
    />
  );
}

export default function ArticleCard({
  article,
  priority = false,
}: {
  article: BlogArticle;
  priority?: boolean;
}) {
  return (
    <article className="group h-full border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_16px_40px_rgba(66,24,47,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#C7A56B] hover:shadow-[0_22px_48px_rgba(66,24,47,0.1)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={article.href} className="flex h-full flex-col">
        <div className="relative aspect-[16/10] overflow-hidden bg-[#F3E6D4]">
          <Cover src={article.image} alt={article.imageAlt} priority={priority} />
        </div>
        <div className="flex flex-1 flex-col px-5 py-5">
          <p className="text-[12px] font-bold text-[#8A642E]">{article.categoryTitle}</p>
          <p className="mt-2 text-[1.2rem] font-black leading-8 text-[#35281F]">{article.title}</p>
          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-7 text-[#5C4A3A]">{article.description}</p>
          <p className="mt-4 text-sm font-bold text-[#7A6042]">{formatReadingTime(article.readingMinutes)}</p>
        </div>
      </Link>
    </article>
  );
}

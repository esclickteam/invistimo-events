"use client";

import { useWeddingSite } from "@/components/wedding-website/editable/WeddingSiteContext";
import {
  EMPTY_WEDDING_GIFTS,
  hasWeddingGifts,
  type WeddingGiftLinks,
} from "@/lib/weddingWebsite/gifts";

const DEMO_GIFTS: WeddingGiftLinks = {
  creditUrl: "#credit",
  payboxUrl: "#paybox",
  bitPhone: "",
  bitUrl: "#bit",
};

type Props = {
  className?: string;
  actionClassName?: string;
};

export default function WeddingGiftActions({
  className = "",
  actionClassName,
}: Props) {
  const site = useWeddingSite();
  const liveGifts = site?.live?.gifts || EMPTY_WEDDING_GIFTS;
  const configured = hasWeddingGifts(liveGifts);
  const isEditor = site?.mode === "editor";
  const isTemplateGallery =
    site?.live?.role === "demo" && !site?.live?.shareId && !isEditor;
  const gifts = configured
    ? liveGifts
    : isTemplateGallery
      ? DEMO_GIFTS
      : EMPTY_WEDDING_GIFTS;
  const previewOnly = isTemplateGallery || isEditor;
  const buttonClass =
    actionClassName ||
    "inline-flex min-h-[48px] items-center justify-center border border-current px-8 py-3 text-sm font-bold";

  if (!hasWeddingGifts(gifts)) {
    if (!isEditor) return null;
    return (
      <p className={`mt-4 text-sm font-semibold opacity-70 ${className}`}>
        כפתורי Bit, אשראי ו-PayBox יופיעו כאן לפי הקישורים ומספר הטלפון ששמרתם בפרטי האירוע.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {gifts.bitUrl || gifts.bitPhone ? (
        <GiftAction
          href={gifts.bitUrl}
          className={buttonClass}
          previewOnly={previewOnly}
          label="Bit"
          extra={gifts.bitPhone}
        />
      ) : null}
      {gifts.creditUrl ? (
        <GiftAction
          href={gifts.creditUrl}
          className={buttonClass}
          previewOnly={previewOnly}
          label="אשראי"
        />
      ) : null}
      {gifts.payboxUrl ? (
        <GiftAction
          href={gifts.payboxUrl}
          className={buttonClass}
          previewOnly={previewOnly}
          label="PayBox"
        />
      ) : null}
    </div>
  );
}

function GiftAction({
  href,
  className,
  previewOnly,
  label,
  extra,
}: {
  href?: string;
  className: string;
  previewOnly: boolean;
  label: string;
  extra?: string;
}) {
  const content = (
    <>
      <span>{label}</span>
      {extra ? (
        <span dir="ltr" className="ms-2 font-mono text-xs font-bold tracking-wide">
          {extra}
        </span>
      ) : null}
    </>
  );

  if (!href || href.startsWith("#") || previewOnly) {
    return (
      <span className={className} dir={extra ? "ltr" : undefined}>
        {content}
      </span>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} dir={extra ? "ltr" : undefined}>
      {content}
    </a>
  );
}

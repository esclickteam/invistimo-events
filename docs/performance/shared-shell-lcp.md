# Shared shell and the wedding-page Lighthouse score

This note records a measured limit. It does not change how the site loads.

## What the trace showed

A mobile trace of the production build of `/wedding-website`, with a cold cache, painted the hero image as the LCP element. The file is `editorial-ceremony-828.webp`, about 30KB, requested at 27ms and finished at 47ms.

The same trace:

- Heebo finished at 78ms, after the image. It uses `font-display: swap` and an Arial fallback.
- The shared client bundle evaluated on the main thread before first paint. The largest slice was about 37ms in `f116dc912b2ffba2.js`.
- The first Next.js RSC prefetch started at 493ms, after the observed LCP at 484ms.
- `/api/me` on an anonymous visit to this page started later and was not part of the paint.

Lighthouse Mobile still scores the page from its Slow 4G simulation. That simulation replays every script and the font that finished before paint, so the reported LCP stays near 4.1–4.3s even when the machine paints the image in 72–168ms. Three local runs after the wedding-page work had a median score of 84, LCP 4.3s, CLS 0, TBT 174ms.

Turning off menu prefetch, or changing only the wedding page, does not move that simulated number. The requests that set it live in the shared root layout.

## What a later change would have to prove

A follow-up may paint the hero before the shared client bundle runs. It has to show, on the homepage and the public marketing pages as well as this page:

- no unstyled flash and no extra layout shift
- header, login, WhatsApp, and the accessibility widget still appear
- a logged-in visitor is still redirected from `/` and `/login`
- three comparable Lighthouse runs with a lower simulated LCP, without a regression on the homepage

This branch does not defer scripts and does not change Next.js loading.

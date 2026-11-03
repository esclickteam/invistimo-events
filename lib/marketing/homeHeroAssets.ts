/** Shared hero media URLs — keep preload (page.tsx) and client video in sync. */
export const HERO_ASSET_V = "20261103v6p1";

export const HERO_DESKTOP = {
  webm: `/marketing/videos/home-cinematic-hero-desktop.webm?v=${HERO_ASSET_V}`,
  mp4: `/marketing/videos/home-cinematic-hero-desktop.mp4?v=${HERO_ASSET_V}`,
  posterWebp: `/marketing/videos/home-cinematic-hero-poster.webp?v=${HERO_ASSET_V}`,
  posterJpg: `/marketing/videos/home-cinematic-hero-poster.jpg?v=${HERO_ASSET_V}`,
} as const;

export const HERO_MOBILE = {
  webm: `/marketing/videos/home-cinematic-hero-mobile.webm?v=${HERO_ASSET_V}`,
  mp4: `/marketing/videos/home-cinematic-hero-mobile.mp4?v=${HERO_ASSET_V}`,
  posterWebp: `/marketing/videos/home-cinematic-hero-mobile-poster.webp?v=${HERO_ASSET_V}`,
  posterJpg: `/marketing/videos/home-cinematic-hero-mobile-poster.jpg?v=${HERO_ASSET_V}`,
} as const;

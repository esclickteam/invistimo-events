/**
 * Verified working media only (checked via HTTP).
 * Do not add URLs here without verifying 200/206 + correct content-type.
 */

const u = (id: string, w = 1600, q = 85) =>
  `https://images.unsplash.com/${id}?w=${w}&q=${q}`;

/** Curated wedding/event stills — all verified 200 */
export const WW_IMAGES = {
  ceremony: u("photo-1519741497674-611481863552"),
  outdoorCouple: u("photo-1469371670807-013ccf25f16a"),
  venueArch: u("photo-1519225421980-715cb0215aed"),
  coupleClose: u("photo-1511285560929-80b456fea0bc"),
  florals: u("photo-1522673607200-164d1b6ce486"),
  elegantHall: u("photo-1511795409834-ef04bbd61622"),
  tableSetting: u("photo-1464366400600-7168b8af9bc3"),
  nightGlow: u("photo-1470229722913-7c0e2dbbafd3"),
  ringsHands: u("photo-1529636798458-92182e662485"),
  aisleWalk: u("photo-1606800052052-a08af7148866"),
  kiss: u("photo-1583939003579-730e3918a45a"),
  softPortrait: u("photo-1591604466107-ec97de577aff"),
  bouquet: u("photo-1545232979-8bf68ee9b1af"),
  celebration: u("photo-1515934751635-c81c6bc9a2d8"),
  beachCouple: u("photo-1523438885200-e635ba2c371e"),
} as const;

/** Verified Pexels MP4s (Range 206 + video/mp4) */
export const WW_VIDEOS = {
  coupleWalk:
    "https://videos.pexels.com/video-files/3255275/3255275-uhd_2560_1440_25fps.mp4",
  romantic:
    "https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_25fps.mp4",
  natureSoft:
    "https://videos.pexels.com/video-files/2169880/2169880-uhd_2560_1440_30fps.mp4",
  celebration:
    "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
} as const;

export function gallerySet(...keys: (keyof typeof WW_IMAGES)[]) {
  return keys.map((k) => WW_IMAGES[k]);
}

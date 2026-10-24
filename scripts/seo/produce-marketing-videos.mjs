/**
 * Produce polished marketing reels from real product clips + invite title cards.
 * Marketing captions (Hebrew). Not a fake UI — uses real recorded product footage.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const FONT = "/usr/share/fonts/truetype/noto/NotoSansHebrew-Bold.ttf";
const OUT = "public/marketing/videos";
const TMP = "/tmp/invistimo-reels";
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

function run(args) {
  execFileSync("ffmpeg", args, { stdio: "inherit" });
}

function titleCard(image, text, outPath, seconds = 2.4) {
  const esc = text.replace(/:/g, "\\:").replace(/'/g, "\u2019");
  run([
    "-y",
    "-loop",
    "1",
    "-i",
    image,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=stereo",
    "-t",
    String(seconds),
    "-vf",
    `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,drawbox=x=0:y=ih-280:w=iw:h=280:color=black@0.45:t=fill,drawtext=fontfile=${FONT}:text='${esc}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-180`,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "1800k",
    "-an",
    "-r",
    "30",
    outPath,
  ]);
}

function normalizePortrait(input, outPath, seconds = 4, ss = 0) {
  run([
    "-y",
    "-ss",
    String(ss),
    "-t",
    String(seconds),
    "-i",
    input,
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p",
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "1600k",
    "-row-mt",
    "1",
    outPath,
  ]);
}

function normalizeLandscape(input, outPath, seconds = 4, ss = 0) {
  run([
    "-y",
    "-ss",
    String(ss),
    "-t",
    String(seconds),
    "-i",
    input,
    "-vf",
    "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x120e0a,fps=30,format=yuv420p",
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "2000k",
    "-row-mt",
    "1",
    outPath,
  ]);
}

function burnAss(input, assPath, outPath) {
  run([
    "-y",
    "-i",
    input,
    "-vf",
    `ass=${assPath}`,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "2200k",
    "-row-mt",
    "1",
    "-an",
    outPath,
  ]);
}

function concat(list, outPath) {
  const listFile = path.join(TMP, `list-${path.basename(outPath)}.txt`);
  fs.writeFileSync(listFile, list.map((f) => `file '${f}'`).join("\n"));
  run(["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath]);
}

function writeAss(file, events, playResX = 1920, playResY = 1080) {
  const body = events
    .map(
      ([start, end, text]) =>
        `Dialogue: 0,${start},${end},Cap,,0,0,0,,${text}`
    )
    .join("\n");
  fs.writeFileSync(
    file,
    `[Script Info]
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Noto Sans Hebrew,46,&H00FFFFFF,&H000000FF,&H64000000,&H96000000,-1,0,0,0,100,100,0,0,3,0,0,2,50,50,56,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${body}
`
  );
}

// --- RSVP portrait reel (phone placement) ---
titleCard(
  "public/marketing/invites/invite-wedding-maya-itai.webp",
  "החתונה של מאיה ואיתי",
  `${TMP}/rsvp-01.webm`,
  2.2
);
normalizePortrait(
  "public/marketing/videos/demo-guest-rsvp.webm",
  `${TMP}/rsvp-02.webm`,
  5,
  0.3
);
normalizePortrait(
  "public/marketing/videos/demo-try-dashboard.webm",
  `${TMP}/rsvp-03.webm`,
  4,
  0.5
);
concat([`${TMP}/rsvp-01.webm`, `${TMP}/rsvp-02.webm`, `${TMP}/rsvp-03.webm`], `${TMP}/rsvp-joined.webm`);
writeAss(
  `${TMP}/rsvp.ass`,
  [
    ["0:00:00.00", "0:00:02.10", "הזמנה דיגיטלית לאירוע"],
    ["0:00:02.20", "0:00:06.80", "האורח מאשר הגעה בקישור האישי"],
    ["0:00:07.00", "0:00:11.00", "התשובה נכנסת לדשבורד מיד"],
  ],
  1080,
  1920
);
burnAss(`${TMP}/rsvp-joined.webm`, `${TMP}/rsvp.ass`, `${OUT}/reel-rsvp-guest.webm`);

// --- Seating landscape cinematic scenes ---
titleCard(
  "public/marketing/product/webp/desktop-try-seating.webp",
  "סידורי הושבה",
  `${TMP}/seat-00.webm`,
  2
);
// convert title to landscape by re-encoding
normalizeLandscape(`${TMP}/seat-00.webm`, `${TMP}/seat-01.webm`, 2, 0);
normalizeLandscape("public/videos/eventsit.mp4", `${TMP}/seat-02.webm`, 4, 2);
normalizeLandscape("public/videos/sit4.mp4", `${TMP}/seat-03.webm`, 3.5, 0);
normalizeLandscape("public/videos/tablesit.mp4", `${TMP}/seat-04.webm`, 4, 3);
normalizeLandscape("public/videos/smartsit.mp4", `${TMP}/seat-05.webm`, 4, 1);
normalizeLandscape(
  "public/marketing/videos/demo-try-seating-raw.webm",
  `${TMP}/seat-06.webm`,
  4,
  2
);
concat(
  [
    `${TMP}/seat-01.webm`,
    `${TMP}/seat-02.webm`,
    `${TMP}/seat-03.webm`,
    `${TMP}/seat-04.webm`,
    `${TMP}/seat-05.webm`,
    `${TMP}/seat-06.webm`,
  ],
  `${TMP}/seat-joined.webm`
);
writeAss(`${TMP}/seat.ass`, [
  ["0:00:00.00", "0:00:02.00", "כל אורח במקום שלו"],
  ["0:00:02.10", "0:00:06.00", "מפת האולם לנגד העיניים"],
  ["0:00:06.10", "0:00:09.50", "מגדירים שולחנות"],
  ["0:00:09.60", "0:00:13.50", "משבצים אורחים"],
  ["0:00:13.60", "0:00:17.50", "חלוקה לפי קבוצות — ותיקון ידני"],
  ["0:00:17.60", "0:00:21.50", "תפוסה ומקומות פנויים בזמן אמת"],
]);
burnAss(`${TMP}/seat-joined.webm`, `${TMP}/seat.ass`, `${OUT}/reel-seating-cinematic.webm`);

// --- Home journey landscape ---
titleCard(
  "public/marketing/invites/invite-save-the-date-maya-itai.webp",
  "Save the Date",
  `${TMP}/home-t1.webm`,
  2
);
normalizeLandscape(`${TMP}/home-t1.webm`, `${TMP}/home-01.webm`, 2, 0);
titleCard(
  "public/marketing/invites/invite-wedding-maya-itai.webp",
  "הזמנה דיגיטלית",
  `${TMP}/home-t2.webm`,
  2
);
normalizeLandscape(`${TMP}/home-t2.webm`, `${TMP}/home-02.webm`, 2, 0);
normalizeLandscape(
  "public/marketing/videos/demo-wedding-eternal-gold.webm",
  `${TMP}/home-03.webm`,
  4,
  0.5
);
normalizeLandscape(`${OUT}/reel-rsvp-guest.webm`, `${TMP}/home-04.webm`, 4, 2);
normalizeLandscape(`${OUT}/reel-seating-cinematic.webm`, `${TMP}/home-05.webm`, 4, 6);
normalizeLandscape(
  "public/marketing/videos/demo-try-dashboard.webm",
  `${TMP}/home-06.webm`,
  3.5,
  1
);
concat(
  [
    `${TMP}/home-01.webm`,
    `${TMP}/home-02.webm`,
    `${TMP}/home-03.webm`,
    `${TMP}/home-04.webm`,
    `${TMP}/home-05.webm`,
    `${TMP}/home-06.webm`,
  ],
  `${TMP}/home-joined.webm`
);
writeAss(`${TMP}/home.ass`, [
  ["0:00:00.00", "0:00:02.00", "Save the Date"],
  ["0:00:02.10", "0:00:04.00", "הזמנה דיגיטלית"],
  ["0:00:04.10", "0:00:08.00", "אתר חתונה אישי"],
  ["0:00:08.10", "0:00:12.00", "אישורי הגעה"],
  ["0:00:12.10", "0:00:16.00", "סידורי הושבה"],
  ["0:00:16.10", "0:00:19.50", "הכל במקום אחד"],
]);
burnAss(`${TMP}/home-joined.webm`, `${TMP}/home.ass`, `${OUT}/reel-home-journey.webm`);

// --- Wedding website portrait ---
normalizePortrait(
  "public/marketing/videos/demo-wedding-eternal-gold.webm",
  `${TMP}/ww-01.webm`,
  8,
  0.2
);
writeAss(
  `${TMP}/ww.ass`,
  [
    ["0:00:00.00", "0:00:03.00", "אתר חתונה אישי"],
    ["0:00:03.10", "0:00:06.00", "פרטי האירוע במקום אחד"],
    ["0:00:06.10", "0:00:08.00", "מחובר לאישורי הגעה"],
  ],
  1080,
  1920
);
burnAss(`${TMP}/ww-01.webm`, `${TMP}/ww.ass`, `${OUT}/reel-wedding-website.webm`);

console.log("Marketing reels written to", OUT);
for (const f of [
  "reel-rsvp-guest.webm",
  "reel-seating-cinematic.webm",
  "reel-home-journey.webm",
  "reel-wedding-website.webm",
]) {
  const p = path.join(OUT, f);
  console.log(f, fs.existsSync(p) ? fs.statSync(p).size : "MISSING");
}

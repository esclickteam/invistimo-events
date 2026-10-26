/**
 * Generate unique phone + light dashboard mockups per event type for public marketing.
 * Not crops of wedding assets — distinct HTML compositions with event-appropriate copy.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';

const ROOT = '/workspace/public/images/rsvp';
const ART = '/opt/cursor/artifacts/screenshots/event-type-mockups';
fs.mkdirSync(ART, { recursive: true });

const EVENTS = [
  {
    id: 'hina',
    dir: 'hina',
    title: 'החינה של נועה ויואב',
    shortNames: 'נועה & יואב',
    inviteLine: 'הנכם מוזמנים לחינה של נועה ויואב',
    when: '18/09/2026',
    time: '19:00',
    place: 'אולמי הפנינה, ירושלים',
    accent: '#6B1F2A',
    soft: '#F7E9EC',
    inviteImg: '/workspace/public/marketing/invites/invite-henna.webp',
    phoneThanksExtra: 'מחכים לחגוג איתכם בחינה',
    schedule: [
      ['קבלת פנים', '19:00'],
      ['טקס החינה', '20:00'],
    ],
    hosts: 'משפחות כהן ולוי',
  },
  {
    id: 'bar',
    dir: 'bar-mitzvah',
    title: 'בר המצווה של אריאל',
    shortNames: 'אריאל',
    inviteLine: 'הנכם מוזמנים לבר המצווה של אריאל',
    when: '05/03/2027',
    time: '18:30',
    place: 'גן האירועים נוף הים, רעננה',
    accent: '#1E3A5F',
    soft: '#EAF0F7',
    inviteImg: '/workspace/public/marketing/invites/invite-bar-mitzvah.webp',
    phoneThanksExtra: 'תודה שאישרתם הגעה לבר המצווה',
    schedule: [
      ['קבלת פנים', '18:30'],
      ['עלייה לתורה / חגיגה', '19:30'],
    ],
    hosts: 'משפחת אברהם',
  },
  {
    id: 'bat',
    dir: 'bat-mitzvah',
    title: 'בת המצווה של יעל',
    shortNames: 'יעל',
    inviteLine: 'הנכם מוזמנים לבת המצווה של יעל',
    when: '12/05/2027',
    time: '18:00',
    place: 'וילה הדר, הוד השרון',
    accent: '#7A3E6B',
    soft: '#F6EAF3',
    inviteImg: '/workspace/public/marketing/invites/invite-bat-mitzvah.webp',
    phoneThanksExtra: 'תודה שאישרתם הגעה לבת המצווה',
    schedule: [
      ['קבלת פנים', '18:00'],
      ['טקס ומסיבה', '19:00'],
    ],
    hosts: 'משפחת דהן',
  },
  {
    id: 'brit',
    dir: 'brit-brita',
    title: 'ברית של איתן',
    shortNames: 'איתן',
    inviteLine: 'הנכם מוזמנים לברית של איתן',
    when: '22/11/2026',
    time: '11:00',
    place: 'מסעדת השקמה, תל אביב',
    accent: '#2F5D6B',
    soft: '#E8F3F5',
    inviteImg: '/workspace/public/marketing/invites/invite-brit.webp',
    phoneThanksExtra: 'תודה שאישרתם הגעה לברית',
    schedule: [
      ['קבלת אורחים', '11:00'],
      ['טקס', '11:30'],
    ],
    hosts: 'משפחות מזרחי וביטון',
  },
];

function md5(buf) {
  return createHash('md5').update(buf).digest('hex');
}

function toJpg(pngPath, jpgPath) {
  execFileSync(
    'ffmpeg',
    ['-y', '-i', pngPath, '-q:v', '3', jpgPath],
    { stdio: 'ignore' },
  );
}

function phoneShell(inner, accent) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;background:#d8cfc3;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .phone{width:390px;height:844px;background:#111;border-radius:42px;padding:12px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
  .screen{width:100%;height:100%;background:#F7F1E6;border-radius:32px;overflow:hidden;display:flex;flex-direction:column}
  .notch{height:28px;background:#F7F1E6;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;letter-spacing:.04em}
  .content{flex:1;overflow:hidden;padding:16px;background:linear-gradient(180deg,${accent}10,transparent 120px),#FBF6EE}
  .card{background:#fff;border-radius:22px;border:1px solid #E6D2AA;padding:18px;box-shadow:0 12px 30px rgba(58,39,20,.08)}
  .brand{font-size:11px;font-weight:800;color:${accent};letter-spacing:.12em;margin-bottom:10px}
  h1{font-size:28px;line-height:1.2;color:#2C241C;margin:8px 0 12px}
  p{font-size:15px;line-height:1.7;color:#5C4A3A}
  .meta{margin-top:14px;display:grid;gap:8px}
  .meta div{font-size:14px;color:#3F3025;background:${accent}12;border-radius:12px;padding:8px 10px}
  .btn{margin-top:16px;display:block;text-align:center;background:linear-gradient(90deg,#3A2B22,#8A642E);color:#fff;font-weight:800;border-radius:999px;padding:14px 16px;font-size:15px}
  .chip{display:inline-block;background:#fff;border:1px solid #DCC7A6;border-radius:999px;padding:8px 12px;margin:4px;font-size:13px;font-weight:700;color:#5E4735}
  .thanks{font-size:34px;text-align:center;margin-top:40px;color:#2C241C}
  .sub{text-align:center;margin-top:12px;color:#5C4A3A}
  .invite-img{width:100%;border-radius:16px;display:block;margin-bottom:12px;max-height:220px;object-fit:cover;object-position:top}
  .wa-head{background:#075E54;color:#fff;padding:10px 14px;font-size:13px;font-weight:700}
  .bubble{background:#DCF8C6;border-radius:14px;padding:12px;margin-top:14px;font-size:14px;line-height:1.6;color:#1b1b1b;box-shadow:0 1px 1px rgba(0,0,0,.06)}
  .link{color:#056162;font-weight:700;word-break:break-all}
</style></head><body><div class="phone"><div class="screen">${inner}</div></div></body></html>`;
}

function dashHtml(ev) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#F3E8D7;padding:24px}
.wrap{width:1280px;height:800px;background:#FFFDF8;border-radius:24px;border:1px solid #E6D2AA;overflow:hidden;display:grid;grid-template-columns:260px 1fr}
.side{background:#FBF6EE;border-left:1px solid #EADDC8;padding:22px}
.logo{font-weight:900;color:${ev.accent};letter-spacing:.08em;margin-bottom:22px}
.nav div{padding:10px 12px;border-radius:12px;margin-bottom:6px;font-size:14px;color:#5C4A3A}
.nav .on{background:${ev.accent}18;color:${ev.accent};font-weight:800}
.main{padding:22px 28px}
.banner{background:linear-gradient(120deg,${ev.soft},${ev.accent}33);border-radius:20px;padding:22px;border:1px solid #E6D2AA}
.banner h1{font-size:30px;color:#2C241C;margin-bottom:8px}
.banner p{color:#5C4A3A;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px}
.stat{background:#fff;border:1px solid #EADDC8;border-radius:16px;padding:14px;text-align:center}
.stat b{display:block;font-size:26px;color:#2C241C;margin-top:6px}
.stat span{font-size:12px;color:#7A6042;font-weight:700}
.note{margin-top:16px;font-size:12px;color:#8A6B45}
</style></head><body><div class="wrap">
<aside class="side"><div class="logo">INVISTIMO</div><div class="nav">
<div class="on">דשבורד</div><div>הזמנה</div><div>רשימת מוזמנים</div><div>שליחת הודעות</div><div>סידורי הושבה</div><div>כניסה לאירוע</div>
</div></aside>
<main class="main">
  <div class="banner"><h1>${ev.title}</h1><p>${ev.when} · ${ev.time} · ${ev.place}</p><p style="margin-top:6px">נתוני הדגמה לפי סוג אירוע — לא נתוני לקוח אמיתי</p></div>
  <div class="stats">
    <div class="stat"><span>סה״כ רשומות</span><b>86</b></div>
    <div class="stat"><span>מגיעים</span><b>61</b></div>
    <div class="stat"><span>לא מגיעים</span><b>9</b></div>
    <div class="stat"><span>מתלבטים</span><b>7</b></div>
    <div class="stat"><span>ממתינים</span><b>9</b></div>
  </div>
  <p class="note">המחשת ממשק מוזמנים ל${ev.title} · Invistimo</p>
</main></div></body></html>`;
}

function seatingHtml(ev) {
  const tables = [
    ['שולחן משפחה', '10/12'],
    ['שולחן חברים', '8/10'],
    ['שולחן סבים', '6/8'],
    ['שולחן עבודה', '4/10'],
  ];
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#EFE4D4;padding:24px}
.wrap{width:1280px;height:800px;background:#FFFDF8;border-radius:24px;border:1px solid #E6D2AA;padding:24px}
h1{font-size:26px;color:#2C241C;margin-bottom:6px}
.sub{color:#7A6042;margin-bottom:18px;font-size:14px}
.grid{display:grid;grid-template-columns:1fr 280px;gap:18px;height:680px}
.canvas{background:radial-gradient(circle at 30% 20%,${ev.soft},#fff 55%);border:1px dashed #DCC7A6;border-radius:20px;position:relative}
.table{position:absolute;width:160px;height:160px;border-radius:999px;border:3px solid ${ev.accent};background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(0,0,0,.08)}
.table b{font-size:14px;color:#2C241C}.table span{font-size:12px;color:#7A6042;margin-top:4px}
.side{background:#FBF6EE;border:1px solid #EADDC8;border-radius:18px;padding:16px}
.side h2{font-size:16px;margin-bottom:12px;color:#2C241C}
.pill{background:#fff;border:1px solid #E6D2AA;border-radius:12px;padding:10px;margin-bottom:8px;font-size:13px;color:#5C4A3A}
</style></head><body><div class="wrap">
<h1>סידורי הושבה · ${ev.title}</h1>
<p class="sub">המחשת מפת שולחנות עם נתוני הדגמה לסוג האירוע</p>
<div class="grid"><div class="canvas">
${tables
  .map(
    (t, i) =>
      `<div class="table" style="top:${80 + (i % 2) * 240}px;right:${120 + Math.floor(i / 2) * 280}px"><b>${t[0]}</b><span>${t[1]}</span></div>`,
  )
  .join('')}
</div>
<aside class="side"><h2>סטטוס שיבוץ</h2>
<div class="pill">משובצים: 28</div>
<div class="pill">פנויים: 12</div>
<div class="pill">לא שובצו: 5</div>
<div class="pill" style="margin-top:16px;font-size:12px;color:#8A6B45">המחשה ל${ev.title} — לא צילום חתונה</div>
</aside></div></div></body></html>`;
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const hashes = {};

for (const ev of EVENTS) {
  const outDir = path.join(ROOT, ev.dir);
  fs.mkdirSync(outDir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  const inviteDataUri = fs.existsSync(ev.inviteImg)
    ? `data:image/webp;base64,${fs.readFileSync(ev.inviteImg).toString('base64')}`
    : '';

  // WhatsApp share mock
  const wa = phoneShell(
    `<div class="wa-head">Invistimo · WhatsApp</div>
     <div class="content">
       <div class="bubble">
         <div style="font-weight:800;margin-bottom:6px">${ev.shortNames}</div>
         ${ev.inviteLine}<br/>
         📅 ${ev.when}<br/>🕒 ${ev.time}<br/>📍 ${ev.place}<br/><br/>
         לאישור הגעה: <span class="link">invistimo.com/i/demo-${ev.id}</span>
       </div>
       ${inviteDataUri ? `<img class="invite-img" style="margin-top:14px" src="${inviteDataUri}" alt=""/>` : ''}
       <a class="btn" style="text-decoration:none">אישור הגעה</a>
     </div>`,
    ev.accent,
  );
  await page.setContent(wa, { waitUntil: 'load' });
  const waPng = path.join(ART, `${ev.id}-phone-whatsapp.png`);
  await page.screenshot({ path: waPng, type: 'png' });
  toJpg(waPng, path.join(outDir, 'phone-whatsapp.jpg'));

  // RSVP form
  const rsvp = phoneShell(
    `<div class="notch">Invistimo</div>
     <div class="content">
       <div class="card">
         <div class="brand">אישור הגעה</div>
         <h1>${ev.title}</h1>
         <p>${ev.hosts}</p>
         <div class="meta">
           ${ev.schedule.map(([a, b]) => `<div><strong>${a}</strong> · ${b}</div>`).join('')}
           <div>📍 ${ev.place}</div>
         </div>
         <div style="margin-top:14px">
           <span class="chip">מגיע/ה</span>
           <span class="chip">לא מגיע/ה</span>
           <span class="chip">עדיין לא בטוחים</span>
         </div>
         <div class="btn">שליחת אישור הגעה</div>
       </div>
     </div>`,
    ev.accent,
  );
  await page.setContent(rsvp, { waitUntil: 'load' });
  const rsvpPng = path.join(ART, `${ev.id}-phone-rsvp.png`);
  await page.screenshot({ path: rsvpPng, type: 'png' });
  toJpg(rsvpPng, path.join(outDir, 'phone-rsvp-form.jpg'));

  // Thanks
  const thanks = phoneShell(
    `<div class="notch">Invistimo</div>
     <div class="content">
       <div class="thanks">תודה!</div>
       <p class="sub">${ev.phoneThanksExtra}</p>
       <div class="card" style="margin-top:28px;text-align:center">
         <p>רשמנו את התשובה שלכם עבור</p>
         <h1 style="font-size:22px">${ev.title}</h1>
         <p style="margin-top:8px">${ev.when} · ${ev.place}</p>
       </div>
     </div>`,
    ev.accent,
  );
  await page.setContent(thanks, { waitUntil: 'load' });
  const thPng = path.join(ART, `${ev.id}-phone-thanks.png`);
  await page.screenshot({ path: thPng, type: 'png' });
  toJpg(thPng, path.join(outDir, 'phone-thanks.jpg'));

  // Optional invite phone for bar (has phone-invite)
  if (ev.id === 'bar' || ev.id === 'hina') {
    const inv = phoneShell(
      `<div class="notch">הזמנה דיגיטלית</div>
       <div class="content">
         ${inviteDataUri ? `<img class="invite-img" style="max-height:480px" src="${inviteDataUri}" alt=""/>` : ''}
         <div class="card"><h1 style="font-size:22px">${ev.title}</h1><p>${ev.inviteLine}</p><div class="btn">לאישור הגעה</div></div>
       </div>`,
      ev.accent,
    );
    await page.setContent(inv, { waitUntil: 'load' });
    const invPng = path.join(ART, `${ev.id}-phone-invite.png`);
    await page.screenshot({ path: invPng, type: 'png' });
    toJpg(invPng, path.join(outDir, 'phone-invite.jpg'));
  }

  await ctx.close();

  // Dashboard + seating at desktop size
  const desk = await browser.newContext({
    viewport: { width: 1328, height: 848 },
    deviceScaleFactor: 1,
  });
  const dpage = await desk.newPage();
  await dpage.setContent(dashHtml(ev), { waitUntil: 'load' });
  const dashPng = path.join(ART, `${ev.id}-dashboard.png`);
  await dpage.screenshot({ path: dashPng, type: 'png', clip: { x: 24, y: 24, width: 1280, height: 800 } });
  toJpg(dashPng, path.join(outDir, 'dashboard-guests.jpg'));

  await dpage.setContent(seatingHtml(ev), { waitUntil: 'load' });
  const seatPng = path.join(ART, `${ev.id}-seating.png`);
  await dpage.screenshot({ path: seatPng, type: 'png', clip: { x: 24, y: 24, width: 1280, height: 800 } });
  toJpg(seatPng, path.join(outDir, 'dashboard-seating.jpg'));
  await desk.close();

  for (const f of ['phone-whatsapp.jpg', 'phone-rsvp-form.jpg', 'phone-thanks.jpg', 'dashboard-guests.jpg', 'dashboard-seating.jpg']) {
    const p = path.join(outDir, f);
    if (fs.existsSync(p)) {
      const h = md5(fs.readFileSync(p));
      hashes[h] = hashes[h] || [];
      hashes[h].push(`${ev.dir}/${f}`);
      console.log('wrote', `${ev.dir}/${f}`, h.slice(0, 8));
    }
  }
}

await browser.close();
const dups = Object.entries(hashes).filter(([, files]) => files.length > 1);
console.log('DUP CHECK', dups.length ? dups : 'none — all unique');

# תוצאות בדיקות — `/credit-gifts` (Preview מקומי)

**תאריך:** 26 באוקטובר 2026 (Asia/Jerusalem)  
**סביבה:** `localhost:3000` על ענף `cursor/credit-gifts-page-upgrade-04f5`  
**אין Merge / אין Deploy לפרודקשן.**

| # | בדיקה | תוצאה | הערות |
| --- | --- | --- | --- |
| 1 | עמוד ציבורי דסקטופ | PASS | Hero + תוכן מלא נטענים |
| 2 | עמוד ציבורי מובייל (390×844) | PASS | Hero + CTA מותאמים |
| 3 | RTL | PASS | `dir="rtl"` / `lang="he"` |
| 4 | קישורי CTA | PASS | Pricing CTA → `/pricing` |
| 5 | הדגמת PayBox (דמו) | PASS | פתיחה + העתקה + QR דמו |
| 6 | הדגמת bit (דמו) | PASS | מספר `0500000000` + toast העתקה |
| 7 | העתקת פרטי בנק | N/A | מחוץ להיקף המוצר — לא מסלול במסך המתנות |
| 8 | QR | PASS | QR מקישור PayBox דמו בלבד |
| 9 | חזרה לאישור הגעה | PASS | קישור `#rsvp-integration` בדמו |
| 10 | הרשאות הגדרות | PASS (קוד) | עורך ב־EventDetailsForm לבעלי אירוע — לא שונה |
| 11 | היעדר חשיפת אירוע אחר | PASS | אין פרטי אירוע אמיתיים בעמוד |
| 12 | Preview בלי פרטי תשלום אמיתיים | PASS | דמו בלבד |
| 13 | תהליך אשראי קיים ללא שינוי | PASS | Backend/סליקה לא שונו |
| 14 | Schema + Canonical | PASS | FAQPage, Service, Breadcrumb, canonical עצמי |
| 15 | נגישות מקלדת (accordion FAQ) | PASS | `details/summary` מקורי |
| 16 | ביצועים מקומיים | PASS חלקי | טעינה מהירה; `/api/me` 500 בלי Mongo — לא שובר עמוד שיווק |
| 17 | טענות מול תנאי ספק | PASS | 2.5% / 5 ימים / העברת זהב 100₪ לפי מסמכי מכירה; PayBox/bit ללא עמלות מומצאות |
| 18 | מדריך bit/PayBox | PASS | `/info/guides/bit-paybox-wedding-invitation` = 200 |
| 19 | `seo-public.test.ts` | PASS | 18/18 |

## ארטיפקטים
- `credit_gifts_desktop_hero.png`
- `credit_gifts_mobile_hero.png`
- `credit_gifts_demo_paybox.png` / `credit_gifts_demo_bit_copied.png`
- `credit_gifts_demo_gift_selection.mp4`
- `docs/seo/credit-gifts-capabilities-map.md`
- `docs/seo/credit-gifts-seo-geo-aeo-report.md`

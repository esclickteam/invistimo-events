/**
 * Civil-to-Hebrew conversion using the standard molad postponement arithmetic.
 * Month names follow common Israeli spelling, without a GPL calendar library.
 */

const HEBREW_EPOCH = 347995.5;
const GREGORIAN_EPOCH = 1721425.5;

const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

const MONTHS = [
  "",
  "ניסן",
  "אייר",
  "סיון",
  "תמוז",
  "אב",
  "אלול",
  "תשרי",
  "חשון",
  "כסלו",
  "טבת",
  "שבט",
  "אדר",
  "אדר ב׳",
];

function leapGregorian(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function gregorianToJd(year: number, month: number, day: number) {
  return (
    GREGORIAN_EPOCH -
    1 +
    365 * (year - 1) +
    Math.floor((year - 1) / 4) -
    Math.floor((year - 1) / 100) +
    Math.floor((year - 1) / 400) +
    Math.floor((367 * month - 362) / 12) +
    (month <= 2 ? 0 : leapGregorian(year) ? -1 : -2) +
    day
  );
}

function hebrewLeap(year: number) {
  return (year * 7 + 1) % 19 < 7;
}

function hebrewYearMonths(year: number) {
  return hebrewLeap(year) ? 13 : 12;
}

function delay1(year: number) {
  const months = Math.floor((235 * year - 234) / 19);
  const parts = 12084 + 13753 * months;
  let day = months * 29 + Math.floor(parts / 25920);
  if ((3 * (day + 1)) % 7 < 3) day += 1;
  return day;
}

function delay2(year: number) {
  const last = delay1(year - 1);
  const present = delay1(year);
  const next = delay1(year + 1);
  if (next - present === 356) return 2;
  if (present - last === 382) return 1;
  return 0;
}

function hebrewMonthDays(year: number, month: number): number {
  if (
    month === 2 ||
    month === 4 ||
    month === 6 ||
    month === 10 ||
    month === 13 ||
    (month === 12 && !hebrewLeap(year)) ||
    (month === 8 && hebrewYearDays(year) % 10 !== 5) ||
    (month === 9 && hebrewYearDays(year) % 10 === 3)
  ) {
    return 29;
  }
  return 30;
}

function hebrewToJd(month: number, day: number, year: number) {
  const months = hebrewYearMonths(year);
  let jd = HEBREW_EPOCH + delay1(year) + delay2(year) + day + 1;
  if (month < 7) {
    for (let mon = 7; mon <= months; mon += 1) jd += hebrewMonthDays(year, mon);
    for (let mon = 1; mon < month; mon += 1) jd += hebrewMonthDays(year, mon);
  } else {
    for (let mon = 7; mon < month; mon += 1) jd += hebrewMonthDays(year, mon);
  }
  return jd;
}

function hebrewYearDays(year: number) {
  return hebrewToJd(7, 1, year + 1) - hebrewToJd(7, 1, year);
}

function jdToHebrew(jd: number) {
  const noon = Math.floor(jd) + 0.5;
  let year = Math.floor((noon - HEBREW_EPOCH) / 365.24682220598) + 1;
  while (noon >= hebrewToJd(7, 1, year + 1)) year += 1;
  while (noon < hebrewToJd(7, 1, year)) year -= 1;
  let month = noon < hebrewToJd(1, 1, year) ? 7 : 1;
  while (noon > hebrewToJd(month, hebrewMonthDays(year, month), year)) month += 1;
  const day = noon - hebrewToJd(month, 1, year) + 1;
  return { year, month, day };
}

function gematriya(value: number) {
  let rest = value;
  let letters = "";
  while (rest >= 400) {
    letters += "ת";
    rest -= 400;
  }
  if (rest >= 100) {
    letters += HUNDREDS[Math.floor(rest / 100)];
    rest %= 100;
  }
  if (rest === 15) letters += "טו";
  else if (rest === 16) letters += "טז";
  else {
    if (rest >= 10) {
      letters += TENS[Math.floor(rest / 10)];
      rest %= 10;
    }
    if (rest > 0) letters += ONES[rest];
  }
  if (letters.length <= 1) return `${letters}׳`;
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

function monthName(year: number, month: number) {
  if (month === 12 && hebrewLeap(year)) return "אדר א׳";
  if (month === 13) return "אדר ב׳";
  return MONTHS[month] || "";
}

export function hebrewDateFromIso(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const hebrew = jdToHebrew(gregorianToJd(year, month, day));
  if (!hebrew.day || !hebrew.month) return "";
  return `${gematriya(hebrew.day)} ${monthName(hebrew.year, hebrew.month)} ${gematriya(hebrew.year % 1000)}`;
}

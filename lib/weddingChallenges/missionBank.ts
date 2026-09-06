import type { MissionCategory, MissionDefinition } from "./types";

type MissionSeed = Omit<MissionDefinition, "active">;

function m(
  id: string,
  category: MissionCategory,
  text: string,
  extra: Partial<Omit<MissionDefinition, "id" | "category" | "text" | "active">> = {}
): MissionSeed {
  const tableBased = extra.tableBased ?? category === "table";
  const boss = extra.boss ?? category === "boss";
  const requiresAlcohol = extra.requiresAlcohol ?? category === "shots";
  return {
    id,
    category,
    text,
    difficulty: extra.difficulty || (boss ? "hard" : "medium"),
    requiresAlcohol,
    minPeople: extra.minPeople ?? 2,
    maxPeople: extra.maxPeople ?? null,
    tableBased,
    cooldownWeight: extra.cooldownWeight ?? (boss ? 4 : 1),
    boss,
    minTables: extra.minTables ?? 0,
    hint: extra.hint,
  };
}

const DANCEFLOOR: MissionSeed[] = [
  m("dancefloor-01", "dancefloor", "תרים/י 3 אנשים שיושבים כבר יותר מדי זמן ותביא/י אותם לרחבה.", { minPeople: 4, hint: "עד סוף השיר", difficulty: "easy" }),
  m("dancefloor-02", "dancefloor", "תגרום/י ל-5 אנשים לקום מהכיסא לפני שהפזמון נגמר.", { minPeople: 6, hint: "לפני שהפזמון נגמר" }),
  m("dancefloor-03", "dancefloor", "תביא/י לרחבה מישהו שאמר לפחות פעם אחת הערב \"אני לא רוקד/ת\".", { minPeople: 2, difficulty: "easy" }),
  m("dancefloor-04", "dancefloor", "תרים/י את כל השולחן שלך לשיר אחד.", { tableBased: true, minPeople: 4, hint: "לשיר אחד" }),
  m("dancefloor-05", "dancefloor", "תאסוף/י 6 אנשים שלא נמצאים כרגע ברחבה ותכניס/י אותם יחד.", { minPeople: 7 }),
  m("dancefloor-06", "dancefloor", "תמצא/י את האדם שנראה הכי עייף ותגרום/י לו לרקוד דקה.", { minPeople: 2, hint: "דקה אחת", difficulty: "easy" }),
  m("dancefloor-07", "dancefloor", "תגרום/י ל-3 אנשים לעשות איתך כניסה מוגזמת לרחבה.", { minPeople: 4 }),
  m("dancefloor-08", "dancefloor", "תתחיל/י מעגל ותצליח/י להגיע ל-10 אנשים.", { minPeople: 10 }),
  m("dancefloor-09", "dancefloor", "תתחיל/י רכבת ותצרף/י לפחות 12 אנשים.", { minPeople: 12, difficulty: "hard" }),
  m("dancefloor-10", "dancefloor", "תגרום/י ל-5 אנשים לעשות את אותה תנועת ריקוד אחריך.", { minPeople: 6 }),
  m("dancefloor-11", "dancefloor", "תבחר/י 4 אנשים שיושבים ותרים/י את כולם בלי להגיד להם מראש למה.", { minPeople: 5 }),
  m("dancefloor-12", "dancefloor", "תביא/י 2 אנשים מהשולחן שלך ו-2 מהשולחן ליד לרחבה.", { minPeople: 5, minTables: 2, tableBased: true }),
  m("dancefloor-13", "dancefloor", "יש לך 60 שניות להביא 5 אנשים חדשים לרחבה.", { minPeople: 6, hint: "60 שניות" }),
  m("dancefloor-14", "dancefloor", "תגרום/י למישהו שחזר עכשיו לשבת לקום שוב.", { minPeople: 2, difficulty: "easy" }),
  m("dancefloor-15", "dancefloor", "תרים/י את האדם הכי מבוגר בשולחן שלך לריקוד אחד.", { tableBased: true, minPeople: 2, hint: "ריקוד אחד", difficulty: "easy" }),
  m("dancefloor-16", "dancefloor", "תגרום/י ל-6 אנשים לעמוד במעגל ולרקוד 20 שניות בלי לצאת.", { minPeople: 6, hint: "20 שניות" }),
  m("dancefloor-17", "dancefloor", "תביא/י 3 אנשים שמחזיקים טלפון ביד לרחבה.", { minPeople: 4 }),
  m("dancefloor-18", "dancefloor", "תגרום/י ל-5 אנשים לעשות איתך \"כולם למעלה\" בדיוק בפזמון.", { minPeople: 6, hint: "בדיוק בפזמון" }),
  m("dancefloor-19", "dancefloor", "תתחיל/י ריקוד מטופש ותגרום/י לעוד 4 אנשים לחקות אותך.", { minPeople: 5 }),
  m("dancefloor-20", "dancefloor", "תגרום/י לאדם הכי רציני בסביבה לעשות תנועה מוגזמת.", { minPeople: 2, difficulty: "easy" }),
  m("dancefloor-21", "dancefloor", "תרים/י 2 אנשים משני שולחנות שונים ותעשה/י מהם צוות רחבה.", { minPeople: 3, minTables: 2 }),
  m("dancefloor-22", "dancefloor", "תצליח/י להחזיר לרחבה מישהו שכבר פרש ממנה.", { minPeople: 2, difficulty: "easy" }),
  m("dancefloor-23", "dancefloor", "תמצא/י מישהו שעומד בצד ותגרום/י לו להיכנס למרכז הרחבה.", { minPeople: 2, difficulty: "easy" }),
  m("dancefloor-24", "dancefloor", "תאסוף/י 8 אנשים ותעשו יחד מעגל קטן באמצע.", { minPeople: 8 }),
  m("dancefloor-25", "dancefloor", "תגרום/י לקבוצה של 5 אנשים לעבור מצד אחד של הרחבה לצד השני בריקוד.", { minPeople: 5 }),
  m("dancefloor-26", "dancefloor", "תגרום/י ל-3 אנשים לשיר את הפזמון בקול תוך כדי ריקוד.", { minPeople: 4, hint: "בפזמון" }),
  m("dancefloor-27", "dancefloor", "תרים/י 5 אנשים בלי להשתמש באף אחד מהשולחן שלך.", { minPeople: 6, tableBased: true, minTables: 2 }),
  m("dancefloor-28", "dancefloor", "תגרום/י לשני אנשים שיושבים אחד ליד השני לקום יחד.", { minPeople: 3, difficulty: "easy" }),
  m("dancefloor-29", "dancefloor", "תבחר/י מישהו והוא חייב לבחור עוד שניים – כולכם לרחבה.", { minPeople: 4 }),
  m("dancefloor-30", "dancefloor", "תביא/י 4 אנשים לרחבה לפני שהשיר מתחלף.", { minPeople: 5, hint: "לפני שהשיר מתחלף" }),
  m("dancefloor-31", "dancefloor", "תרים/י 3 אנשים שעדיין לא ראית רוקדים הערב.", { minPeople: 4 }),
  m("dancefloor-32", "dancefloor", "תגרום/י ל-6 אנשים ליצור איתך \"קיר ריקוד\" לשנייה אחת.", { minPeople: 7 }),
  m("dancefloor-33", "dancefloor", "תביא/י מישהו לרחבה ותגרום/י לו להביא איתו עוד שניים.", { minPeople: 4 }),
  m("dancefloor-34", "dancefloor", "תתחיל/י מעגל של 4 אנשים ותסיים/י עם לפחות 10.", { minPeople: 10 }),
  m("dancefloor-35", "dancefloor", "תבחר/י אדם אחד שנראה ביישן ותגרום/י לו להישאר ברחבה לפחות שיר אחד.", { minPeople: 2, hint: "לפחות שיר אחד", difficulty: "easy" }),
  m("dancefloor-36", "dancefloor", "תגרום/י ל-5 אנשים לעבור מהשולחן לרחבה בלי לומר את המילה \"ריקוד\".", { minPeople: 6 }),
];

const SHOTS: MissionSeed[] = [
  m("shots-01", "shots", "תארגן/י צ’ייסר של 5 אנשים.", { minPeople: 5 }),
  m("shots-02", "shots", "תאסוף/י 7 אנשים לצ’ייסר קבוצתי.", { minPeople: 7 }),
  m("shots-03", "shots", "תעשה/י צ’ייסר עם 4 אנשים שלא כולם מאותו שולחן.", { minPeople: 4, minTables: 2 }),
  m("shots-04", "shots", "תגרום/י לשולחן ליד להצטרף אליכם לצ’ייסר.", { tableBased: true, minPeople: 6, minTables: 2 }),
  m("shots-05", "shots", "תאסוף/י נציג אחד מ-5 שולחנות שונים לצ’ייסר.", { minPeople: 5, minTables: 5, difficulty: "hard" }),
  m("shots-06", "shots", "יש לך 90 שניות לארגן צ’ייסר של 8 אנשים.", { minPeople: 8, hint: "90 שניות" }),
  m("shots-07", "shots", "תעשה/י צ’ייסר ואז תיקח/י לפחות 4 מהמשתתפים ישר לרחבה.", { minPeople: 5 }),
  m("shots-08", "shots", "תגרום/י ל-6 אנשים להרים כוס בדיוק באותו רגע.", { minPeople: 6 }),
  m("shots-09", "shots", "תארגן/י צ’ייסר בלי להשתמש באף אחד מהשולחן שלך.", { minPeople: 4, tableBased: true, minTables: 2 }),
  m("shots-10", "shots", "תבחר/י אדם אחד והוא צריך לגייס עוד 4 לצ’ייסר.", { minPeople: 6 }),
  m("shots-11", "shots", "תאסוף/י 5 אנשים שיושבים כרגע ותארגן/י להם צ’ייסר.", { minPeople: 6 }),
  m("shots-12", "shots", "תגרום/י ל-2 קבוצות שלא ישבו יחד לעשות צ’ייסר אחד משותף.", { minPeople: 6, minTables: 2 }),
  m("shots-13", "shots", "תעשה/י צ’ייסר עם 3 אנשים שהגיעו מצדדים שונים של האירוע.", { minPeople: 4 }),
  m("shots-14", "shots", "תאסוף/י 10 אנשים ל\"לחיים\" אחד גדול.", { minPeople: 10, difficulty: "hard" }),
  m("shots-15", "shots", "תארגן/י צ’ייסר של 6 אנשים ואז כולם חייבים להגיע לרחבה.", { minPeople: 6 }),
  m("shots-16", "shots", "תגרום/י למישהו אחר להיות \"מגייס הצ’ייסר\" ולהביא 5 אנשים.", { minPeople: 6 }),
  m("shots-17", "shots", "תעשה/י צ’ייסר עם קבוצה שאף אחד בה לא יושב לידך.", { minPeople: 4, tableBased: true }),
  m("shots-18", "shots", "תאסוף/י 5 אנשים תוך פחות מדקה לצ’ייסר.", { minPeople: 5, hint: "פחות מדקה" }),
  m("shots-19", "shots", "תמצא/י 4 אנשים שכבר עומדים ליד הבר ותהפוך/י אותם לצ’ייסר קבוצתי.", { minPeople: 4 }),
  m("shots-20", "shots", "תארגן/י צ’ייסר של שולחן מול שולחן.", { tableBased: true, minPeople: 6, minTables: 2 }),
  m("shots-21", "shots", "תגרום/י ל-8 אנשים לעשות \"לחיים\" ואז להיכנס יחד לרחבה.", { minPeople: 8 }),
  m("shots-22", "shots", "תעשה/י צ’ייסר עם 5 אנשים ואז תגרום/י לכולם להיכנס לרחבה תוך 20 שניות.", { minPeople: 5, hint: "20 שניות לרחבה" }),
];

const TABLE: MissionSeed[] = [
  m("table-01", "table", "תגרום/י לכל השולחן שלך לקום יחד לרחבה.", { minPeople: 4, hint: "כולם יחד" }),
  m("table-02", "table", "תבחר/י את האדם הכי שקט בשולחן ותגרום/י לו להוביל את כולם.", { minPeople: 3 }),
  m("table-03", "table", "תגרום/י לשולחן שלך לעשות \"לחיים\" ביחד.", { minPeople: 3, difficulty: "easy" }),
  m("table-04", "table", "תרים/י 4 אנשים מהשולחן שלך ותיקח/י אותם לרחבה.", { minPeople: 5 }),
  m("table-05", "table", "תגרום/י לכל מי שבשולחן שעדיין לא רקד לקום.", { minPeople: 3 }),
  m("table-06", "table", "תבחר/י מישהו מהשולחן והוא חייב לבחור עוד שניים לרחבה.", { minPeople: 4 }),
  m("table-07", "table", "תגרום/י לשולחן שלך להתחיל למחוא כפיים בקצב עד ששולחן אחר מצטרף.", { minPeople: 4, minTables: 2 }),
  m("table-08", "table", "תגרום/י לשולחן שלך לעשות כניסה משותפת לרחבה.", { minPeople: 4 }),
  m("table-09", "table", "תבחר/י אדם אחד מהשולחן ותן/י לו 30 שניות לגייס את כולם.", { minPeople: 4, hint: "30 שניות" }),
  m("table-10", "table", "תגרום/י לחצי שולחן שלך להביא את החצי השני לרחבה.", { minPeople: 4 }),
  m("table-11", "table", "תבחר/י את מי שהכי \"לא בקטע\" ותגרום/י לו להיות הראשון שקם.", { minPeople: 2, difficulty: "easy" }),
  m("table-12", "table", "תגרום/י לשולחן שלך להקים שולחן אחר.", { minPeople: 4, minTables: 2 }),
  m("table-13", "table", "תגרום/י ל-5 אנשים מהשולחן לעבור יחד לרחבה בלי להתפזר.", { minPeople: 5 }),
  m("table-14", "table", "תגרום/י לכל השולחן להרים ידיים ביחד כשהפזמון מגיע.", { minPeople: 3, hint: "בפזמון", difficulty: "easy" }),
  m("table-15", "table", "תבחר/י \"קפטן שולחן\" והוא צריך להביא לפחות 5 אנשים לרחבה.", { minPeople: 6 }),
  m("table-16", "table", "תגרום/י לשולחן שלך להיות הראשון שקם בשיר הבא.", { minPeople: 3, hint: "השיר הבא" }),
  m("table-17", "table", "תגרום/י ל-3 אנשים מהשולחן לבחור כל אחד אדם נוסף לרחבה.", { minPeople: 7 }),
  m("table-18", "table", "תגרום/י לשולחן שלך להתחיל משהו ששולחן ליד מחקה.", { minPeople: 4, minTables: 2 }),
  m("table-19", "table", "תרים/י את שני האנשים שיושבים הכי רחוק אחד מהשני בשולחן.", { minPeople: 3, difficulty: "easy" }),
  m("table-20", "table", "תגרום/י ל-6 אנשים מהשולחן לעמוד ביחד ליד הרחבה תוך 30 שניות.", { minPeople: 6, hint: "30 שניות" }),
  m("table-21", "table", "תגרום/י לשולחן שלך לעשות סיבוב אחד סביב עצמו ואז לצאת לרקוד.", { minPeople: 4 }),
  m("table-22", "table", "תבחר/י שני אנשים מהשולחן שהם \"אחראי ההרמות\" לדקה.", { minPeople: 3, hint: "דקה" }),
  m("table-23", "table", "תגרום/י לשולחן שלם לעשות כניסה מצחיקה לרחבה.", { minPeople: 4 }),
  m("table-24", "table", "תגרום/י לכל השולחן שלך להצטרף לשיר אחד, אפילו רק לדקה.", { minPeople: 4, hint: "שיר אחד / דקה" }),
];

const CHAOS: MissionSeed[] = [
  m("chaos-01", "chaos", "יש לך 60 שניות להקים 7 אנשים שיושבים.", { minPeople: 8, hint: "60 שניות" }),
  m("chaos-02", "chaos", "תגרום/י ל-10 אנשים להצטרף אליך בלי שהם היו ברחבה קודם.", { minPeople: 11, difficulty: "hard" }),
  m("chaos-03", "chaos", "תאסוף/י 8 אנשים משלושה שולחנות שונים לרחבה.", { minPeople: 8, minTables: 3 }),
  m("chaos-04", "chaos", "תתחיל/י מעגל של 4 ותסיים/י עם 12.", { minPeople: 12 }),
  m("chaos-05", "chaos", "תגרום/י ל-3 שולחנות שונים לשלוח נציג לרחבה.", { minPeople: 4, minTables: 3 }),
  m("chaos-06", "chaos", "תבחר/י אדם אחד והוא חייב להביא 2, וכל אחד מהם עוד 2.", { minPeople: 8 }),
  m("chaos-07", "chaos", "תגרום/י ל-10 אנשים לעשות \"לחיים\" ואז לרוץ לרחבה.", { minPeople: 10 }),
  m("chaos-08", "chaos", "תביא/י 5 אנשים לרחבה בלי לדבר איתם יותר מ-10 שניות כל אחד.", { minPeople: 6, hint: "10 שניות לכל אחד" }),
  m("chaos-09", "chaos", "תגרום/י ל-8 אנשים לעשות את אותה תנועה בדיוק.", { minPeople: 8 }),
  m("chaos-10", "chaos", "תבחר/י 3 אנשים שיושבים רחוק אחד מהשני ותאחד/י אותם ברחבה.", { minPeople: 4 }),
  m("chaos-11", "chaos", "תרים/י 5 אנשים ואז כל אחד מהם חייב להביא אדם נוסף.", { minPeople: 11 }),
  m("chaos-12", "chaos", "תגרום/י ל-2 שולחנות להתחרות מי מגיע ראשון לרחבה.", { minPeople: 6, minTables: 2, tableBased: true }),
  m("chaos-13", "chaos", "תאסוף/י קבוצה של 10 אנשים לפני סוף השיר.", { minPeople: 10, hint: "לפני סוף השיר" }),
  m("chaos-14", "chaos", "תתחיל/י רכבת של 3 ותגיע/י ל-15.", { minPeople: 15, difficulty: "hard" }),
  m("chaos-15", "chaos", "תגרום/י לקבוצה של 6 אנשים להיכנס לרחבה בריצה דרמטית.", { minPeople: 6 }),
  m("chaos-16", "chaos", "תבחר/י אדם אחד כ\"קפטן כאוס\" והוא צריך לגייס 7 אנשים.", { minPeople: 8 }),
  m("chaos-17", "chaos", "תגרום/י ל-5 אנשים להעביר את המשימה מאחד לשני עד שכולם ברחבה.", { minPeople: 6 }),
  m("chaos-18", "chaos", "תביא/י 4 אנשים מצד אחד של האולם ו-4 מצד אחר יחד לרחבה.", { minPeople: 8 }),
  m("chaos-19", "chaos", "תקים/י 8 אנשים בלי לקחת יותר מ-2 מאותו שולחן.", { minPeople: 8, minTables: 4 }),
  m("chaos-20", "chaos", "תגרום/י ל-6 אנשים ליצור מעגל סביב אדם אחד.", { minPeople: 7 }),
  m("chaos-21", "chaos", "תגרום/י ל-10 אנשים לצעוק \"מזל טוב\" ואז להיכנס יחד לרחבה.", { minPeople: 10 }),
  m("chaos-22", "chaos", "תבחר/י שולחן אקראי ותנסה/י להוציא ממנו לפחות 5 אנשים תוך דקה.", { minPeople: 6, hint: "דקה", minTables: 2 }),
  m("chaos-23", "chaos", "תגרום/י לשני מעגלי ריקוד נפרדים להתחבר למעגל אחד.", { minPeople: 8 }),
  m("chaos-24", "chaos", "תביא/י 6 אנשים לרחבה, ואז תגרום/י להם לבחור עוד 6.", { minPeople: 13, difficulty: "hard" }),
  m("chaos-25", "chaos", "תגרום/י ל-10 אנשים להחליף מקום מהשולחן לרחבה תוך 45 שניות.", { minPeople: 10, hint: "45 שניות" }),
  m("chaos-26", "chaos", "תאסוף/י 5 אנשים שמחזיקים כרגע טלפון ותוציא/י אותם לרחבה.", { minPeople: 6 }),
  m("chaos-27", "chaos", "תגרום/י ל-3 קבוצות שונות לעשות איתך אותה תנועה.", { minPeople: 7 }),
  m("chaos-28", "chaos", "תגרום/י ל-8 אנשים לעשות כניסה \"בהילוך איטי\" לרחבה.", { minPeople: 8 }),
  m("chaos-29", "chaos", "תבחר/י אדם אחד שלא מכיר את המשימה ותגרום/י לו להפוך למוביל שלה.", { minPeople: 2, difficulty: "easy" }),
];

const CHEEKY: MissionSeed[] = [
  m("cheeky-01", "cheeky", "תמצא/י מישהו שאמר \"עוד מעט\" ותגרום/י לו לקום עכשיו.", { minPeople: 2, difficulty: "easy" }),
  m("cheeky-02", "cheeky", "תגרום/י למישהו שהולך לשבת להסתובב ולחזור לרחבה.", { minPeople: 2, difficulty: "easy" }),
  m("cheeky-03", "cheeky", "תמצא/י מישהו שתקוע בטלפון ותגרום/י לו לשים אותו בצד לשיר אחד.", { minPeople: 2, hint: "שיר אחד", difficulty: "easy" }),
  m("cheeky-04", "cheeky", "תבחר/י את האדם שנראה הכי נוח בכיסא ותגרום/י לו לקום.", { minPeople: 2, difficulty: "easy" }),
  m("cheeky-05", "cheeky", "תמצא/י מישהו שמתחמק מהרחבה כל הערב ותצליח/י סוף סוף להכניס אותו.", { minPeople: 2 }),
  m("cheeky-06", "cheeky", "תגרום/י למישהו שאמר \"אני עייף\" לרקוד 30 שניות.", { minPeople: 2, hint: "30 שניות", difficulty: "easy" }),
  m("cheeky-07", "cheeky", "תבחר/י אדם רציני ותגרום/י לו לעשות ריקוד מטופש איתך.", { minPeople: 2 }),
  m("cheeky-08", "cheeky", "תמצא/י מישהו שעומד רק בצד ותכניס/י אותו למרכז.", { minPeople: 2, difficulty: "easy" }),
  m("cheeky-09", "cheeky", "תגרום/י למישהו שכבר הוריד נעליים/ג’קט כי \"נגמר לו\" לחזור לשיר אחד.", { minPeople: 2, hint: "שיר אחד" }),
  m("cheeky-10", "cheeky", "תבחר/י מישהו שלא נראה שהוא מכיר את השיר ותגרום/י לו לרקוד כאילו הוא כן.", { minPeople: 2, difficulty: "easy" }),
  m("cheeky-11", "cheeky", "תגרום/י לאדם אחד לגרור איתו את כל החבורה שלו לרחבה.", { minPeople: 4 }),
  m("cheeky-12", "cheeky", "תבחר/י מישהו שיושב לבד לרגע ותיקח/י אותו איתך.", { minPeople: 2, difficulty: "easy" }),
  m("cheeky-13", "cheeky", "תגרום/י ל-3 אנשים להגיד \"לא\" ואז בכל זאת להצטרף מרצונם.", { minPeople: 4 }),
  m("cheeky-14", "cheeky", "תמצא/י את מי שמצלם את כולם במקום לרקוד ותכניס/י אותו לפריים האמיתי.", { minPeople: 2 }),
  m("cheeky-15", "cheeky", "תגרום/י למישהו שמחכה \"לשיר טוב\" לקום לפני שהוא מגיע.", { minPeople: 2, difficulty: "easy" }),
  m("cheeky-16", "cheeky", "תבחר/י את האדם הכי אדיש בסביבה ותגרום/י לו להרים ידיים.", { minPeople: 2, difficulty: "easy" }),
  m("cheeky-17", "cheeky", "תגרום/י למישהו לעזוב את השולחן שלו ולגייס איתך עוד 3 אנשים.", { minPeople: 5 }),
  m("cheeky-18", "cheeky", "תמצא/י שני אנשים שסתם מדברים בצד ותגרום/י להם להמשיך את השיחה ברחבה.", { minPeople: 3, difficulty: "easy" }),
  m("cheeky-19", "cheeky", "תבחר/י אדם אחד ותאמר/י לו: \"יש לך 10 שניות לבחור עוד 3 לרחבה.\"", { minPeople: 5, hint: "10 שניות" }),
  m("cheeky-20", "cheeky", "תגרום/י למישהו שמסרב לרקוד לבחור במקומו 3 אנשים שכן יבואו איתך.", { minPeople: 5 }),
];

const BOSS: MissionSeed[] = [
  m("boss-01", "boss", "יש לך 2 דקות להכניס 15 אנשים חדשים לרחבה.", { minPeople: 16, hint: "2 דקות", difficulty: "hard" }),
  m("boss-02", "boss", "תרים/י שולחן שלם ותביא/י אותו לרחבה.", { tableBased: true, minPeople: 6, difficulty: "hard" }),
  m("boss-03", "boss", "תארגן/י צ’ייסר של 10 אנשים ואז תכניס/י את כולם לרחבה.", { requiresAlcohol: true, minPeople: 10, difficulty: "hard" }),
  m("boss-04", "boss", "תתחיל/י רכבת ותגיע/י לפחות ל-20 אנשים.", { minPeople: 20, difficulty: "hard" }),
  m("boss-05", "boss", "תגרום/י ל-3 שולחנות שונים להגיע יחד לרחבה.", { minPeople: 12, minTables: 3, difficulty: "hard" }),
  m("boss-06", "boss", "תיצור/י מעגל של לפחות 15 אנשים.", { minPeople: 15, difficulty: "hard" }),
  m("boss-07", "boss", "תגרום/י ל-10 אנשים שיושבים עכשיו לקום לפני סוף השיר.", { minPeople: 11, hint: "לפני סוף השיר", difficulty: "hard" }),
  m("boss-08", "boss", "תבחר/י 5 אנשים, וכל אחד מהם חייב להביא עוד אדם אחד לרחבה.", { minPeople: 11, difficulty: "hard" }),
  m("boss-09", "boss", "תצליח/י להחזיר לרחבה 8 אנשים שכבר התיישבו.", { minPeople: 9, difficulty: "hard" }),
  m("boss-10", "boss", "תגרום/י לחצי מהשולחן שלך וחצי מהשולחן ליד לצאת יחד לרחבה.", { tableBased: true, minPeople: 8, minTables: 2, difficulty: "hard" }),
];

export const WEDDING_CHALLENGE_MISSIONS: MissionDefinition[] = [
  ...DANCEFLOOR,
  ...SHOTS,
  ...TABLE,
  ...CHAOS,
  ...CHEEKY,
  ...BOSS,
].map((mission) => ({ ...mission, active: true }));

export function getMissionById(id: string) {
  return WEDDING_CHALLENGE_MISSIONS.find((mission) => mission.id === id) || null;
}

export function missionsByCategory(category: MissionCategory) {
  return WEDDING_CHALLENGE_MISSIONS.filter((mission) => mission.category === category);
}

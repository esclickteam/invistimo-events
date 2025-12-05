/**
 * loadFont.ts
 * טוען פונט מגוגל בזמן אמת כדי שקאנבס (Konva) יוכל להשתמש בו.
 */

export const loadFont = async (fontFamily: string) => {
  if (!fontFamily) return;

  // החלפת רווחים ל־+
  const googleFont = fontFamily.replace(/ /g, "+");

  const fontUrl = `https://fonts.googleapis.com/css2?family=${googleFont}:wght@300;400;500;600;700&display=swap`;

  // אם כבר טענו את הפונט — לא לטעון שוב
  if (document.querySelector(`link[data-font='${fontFamily}']`)) {
    await document.fonts.load(`16px "${fontFamily}"`);
    return;
  }

  // יצירת <link> שמטעין את הפונט
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = fontUrl;
  link.setAttribute("data-font", fontFamily);
  document.head.appendChild(link);

  // המתנה לטעינת הפונט ע"י הדפדפן
  try {
    await document.fonts.load(`16px "${fontFamily}"`);
  } catch (e) {
    console.warn("Font failed to load:", fontFamily);
  }
};

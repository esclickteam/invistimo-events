export function countSmsParts(text: string) {
  const isUnicode = /[^\u0000-\u007F]/.test(text);

  const single = isUnicode ? 70 : 160;
  const multi = isUnicode ? 67 : 153;

  const length = [...text].length; // ✅ ספירה אמיתית

  if (length <= single) return 1;
  return Math.ceil(length / multi);
}

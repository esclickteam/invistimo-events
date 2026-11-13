import Link from "next/link";

export default function PersonalDataNotice({
  text = "שליחת הטופס כרוכה בעיבוד הפרטים שמסרתם לצורך טיפול בפנייתכם",
}: {
  text?: string;
}) {
  return (
    <p className="text-xs leading-6 text-[#7B6754]">
      {text}, בהתאם ל
      <Link
        href="/privacy"
        className="font-bold text-[#842B4C] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A582]"
      >
        מדיניות הפרטיות
      </Link>
      .
    </p>
  );
}

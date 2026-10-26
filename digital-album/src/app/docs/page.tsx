import Link from "next/link";
import { Logo } from "@/components/ui";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  let architecture = "";
  try {
    architecture = await readFile(
      path.join(process.cwd(), "docs/ARCHITECTURE.md"),
      "utf8"
    );
  } catch {
    architecture = "מסמך הארכיטקטורה יופיע כאן לאחר יצירתו.";
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="font-display text-4xl mt-8 mb-6">תיעוד טכני</h1>
      <pre className="surface whitespace-pre-wrap p-6 text-sm leading-relaxed overflow-x-auto">
        {architecture}
      </pre>
    </main>
  );
}

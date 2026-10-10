import connectDB from "@/lib/db";
import { syncOutdatedQuoteTerms } from "@/lib/quoteTermsSync";

async function main() {
  await connectDB();
  const result = await syncOutdatedQuoteTerms();
  console.log(
    JSON.stringify(
      {
        ok: true,
        matched: result.matched,
        modified: result.modified,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

import SalesDocument from "@/models/SalesDocument";
import {
  QUOTE_TERMS_VERSION,
  buildQuoteTermsUpdate,
} from "@/lib/quoteCustomerTerms";

export async function syncOutdatedQuoteTerms() {
  const docs = await SalesDocument.find({
    type: "quote",
    quoteTermsVersion: { $ne: QUOTE_TERMS_VERSION },
  }).lean();

  if (docs.length === 0) {
    return { matched: 0, modified: 0 };
  }

  const operations = docs.flatMap((doc) => {
    const record = doc as unknown as Record<string, unknown>;
    const set = buildQuoteTermsUpdate(record);
    if (!set) return [];

    return [
      {
        updateOne: {
          filter: {
            _id: (doc as { _id: unknown })._id,
            type: "quote",
            quoteTermsVersion: { $ne: QUOTE_TERMS_VERSION },
          },
          update: { $set: set },
        },
      },
    ];
  });

  if (operations.length === 0) {
    return { matched: docs.length, modified: 0 };
  }

  const result = await SalesDocument.bulkWrite(operations, { ordered: false });
  return {
    matched: docs.length,
    modified: result.modifiedCount,
  };
}

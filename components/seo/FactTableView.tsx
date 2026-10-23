import type { FactTable } from "@/lib/seo/answers";

export default function FactTableView({ table }: { table: FactTable }) {
  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-right text-sm">
        <caption className="mb-3 text-right text-base font-black text-[#35281F]">{table.caption}</caption>
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="border border-[#E6D2AA] bg-[#F7F1E8] px-3 py-3 font-black text-[#35281F]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td
                  key={`${row[0]}-${index}`}
                  className="border border-[#E6D2AA] px-3 py-3 leading-6 text-[#5C4A3A]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

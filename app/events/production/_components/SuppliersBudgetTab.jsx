export default function SuppliersBudgetTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {["אולם", "DJ", "צילום", "תאורה"].map((label) => (
        <div key={label} className="border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-lg">{label}</h3>

          <input className="border rounded p-2 w-full" placeholder="שם ספק" />
          <input className="border rounded p-2 w-full" placeholder="מחיר כולל" />
          <input className="border rounded p-2 w-full" placeholder="מקדמה" />

          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">מחיר</th>
                <th className="p-2">מקדמה</th>
                <th className="p-2">יתרה</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-center">
                <td className="p-2">₪10,000</td>
                <td className="p-2">₪3,000</td>
                <td className="p-2 font-bold">₪7,000</td>
              </tr>
            </tbody>
          </table>

          <button className="text-green-700 text-sm font-semibold">
            ✔ בחירת זוג
          </button>
        </div>
      ))}
    </div>
  );
}

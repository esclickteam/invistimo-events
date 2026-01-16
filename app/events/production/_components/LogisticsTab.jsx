export default function LogisticsTab() {
  return (
    <div className="max-w-2xl space-y-4">
      <h3 className="font-semibold">🚚 לוגיסטיקה</h3>

      {["הסעות", "ציוד", "פרחים", "השכרות"].map((item) => (
        <label key={item} className="flex items-center gap-3">
          <input type="checkbox" />
          <span>{item}</span>
        </label>
      ))}

      <textarea
        className="border rounded p-2 w-full"
        placeholder="הערות לוגיסטיות"
      />
    </div>
  );
}

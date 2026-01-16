export default function OverviewTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">💰 תקציב</h3>
        <p>תקציב יעד: ₪120,000</p>
        <p>התחייבויות: ₪86,500</p>
        <p className="font-bold text-green-600">יתרה: ₪33,500</p>
      </div>

      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">🎧 ספקים</h3>
        <p>סגורים: 3</p>
        <p className="text-yellow-600">פתוחים: 2</p>
      </div>

      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">🚚 לוגיסטיקה</h3>
        <p>משימות פתוחות: 4</p>
        <p className="text-red-600">דורש טיפול</p>
      </div>
    </div>
  );
}

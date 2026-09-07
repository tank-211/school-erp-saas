export default function SummaryCard({ title, count, color }) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700"
  };

  return (
    <div className={`border-l-4 rounded-lg shadow-sm p-6 ${colorMap[color]}`}>
      <p className="text-sm font-semibold opacity-75">{title}</p>
      <p className="text-4xl font-bold mt-2">{count}</p>
    </div>
  );
}

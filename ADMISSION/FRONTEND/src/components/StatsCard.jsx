/**
 * StatsCard Component
 * Displays a single statistic with label, value, and optional color
 * Props: label, value, color, icon
 */
export function StatsCard({
  label,
  value,
  color = "var(--gray-900)",
  icon: Icon,
}) {
  return (
    <div className="stat-card">
      {Icon && <Icon size={20} style={{ color, marginBottom: 8 }} />}
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

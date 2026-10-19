import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string
  trend: string
  trendDirection: 'up' | 'down' | 'new'
  accent: string
  onClick?: () => void
}

export default function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
  accent,
  onClick,
}: MetricCardProps) {
  const trendClass =
    trendDirection === 'up'
      ? 'trend--up'
      : trendDirection === 'down'
      ? 'trend--down'
      : 'trend--new'

  return (
    <div className="metric-card" onClick={onClick}>
      <div className="metric-icon" style={{ background: accent }}>
        <Icon size={18} color="#fff" />
      </div>
      <div className="metric-info">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <span className={`metric-trend ${trendClass}`}>{trend}</span>
    </div>
  )
}

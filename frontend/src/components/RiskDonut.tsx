interface RiskDonutProps {
  low: number
  medium: number
  high: number
  total: number
}

export default function RiskDonut({ low, medium, high, total }: RiskDonutProps) {
  const lowPct = total ? Math.round((low / total) * 100) : 0
  const medPct = total ? Math.round((medium / total) * 100) : 0
  const highPct = total ? Math.round((high / total) * 100) : 0

  const lowDeg = (lowPct / 100) * 360
  const medDeg = (medPct / 100) * 360
  const highDeg = (highPct / 100) * 360

  const lowOffset = 0
  const medOffset = lowDeg
  const highOffset = lowDeg + medDeg

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div className="donut-container">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="14" />
          {lowDeg > 0 && (
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#4ade80"
              strokeWidth="14"
              strokeDasharray={`${(lowDeg / 360) * 314} 314`}
              strokeDashoffset={0}
              transform="rotate(-90 60 60)"
            />
          )}
          {medDeg > 0 && (
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="14"
              strokeDasharray={`${(medDeg / 360) * 314} 314`}
              strokeDashoffset={-(medOffset / 360) * 314}
              transform="rotate(-90 60 60)"
            />
          )}
          {highDeg > 0 && (
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#f87171"
              strokeWidth="14"
              strokeDasharray={`${(highDeg / 360) * 314} 314`}
              strokeDashoffset={-(highOffset / 360) * 314}
              transform="rotate(-90 60 60)"
            />
          )}
        </svg>
        <div className="donut-center">
          <span className="donut-total">{total}</span>
          <span className="donut-label">Total</span>
        </div>
      </div>
      <div className="donut-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#4ade80' }} />
          <span>Low Risk</span>
          <strong>{low} ({lowPct}%)</strong>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#fbbf24' }} />
          <span>Medium Risk</span>
          <strong>{medium} ({medPct}%)</strong>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f87171' }} />
          <span>High Risk</span>
          <strong>{high} ({highPct}%)</strong>
        </div>
      </div>
    </div>
  );
}

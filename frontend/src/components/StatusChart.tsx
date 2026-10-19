interface StatusChartProps {
  low: number;
  medium: number;
  high: number;
}

export default function StatusChart({ low, medium, high }: StatusChartProps) {
  const max = Math.max(low, medium, high, 1);
  const lowH = (low / max) * 120;
  const medH = (medium / max) * 120;
  const highH = (high / max) * 120;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '32px', height: '160px', padding: '0 8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{low}</span>
        <div
          style={{
            width: '100%',
            maxWidth: '60px',
            height: `${lowH}px`,
            background: '#4ade80',
            borderRadius: '6px 6px 0 0',
            minHeight: '4px',
          }}
        />
        <span style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>Completed</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{medium}</span>
        <div
          style={{
            width: '100%',
            maxWidth: '60px',
            height: `${medH}px`,
            background: '#60a5fa',
            borderRadius: '6px 6px 0 0',
            minHeight: '4px',
          }}
        />
        <span style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>Under Review</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{high}</span>
        <div
          style={{
            width: '100%',
            maxWidth: '60px',
            height: `${highH}px`,
            background: '#f87171',
            borderRadius: '6px 6px 0 0',
            minHeight: '4px',
          }}
        />
        <span style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>Flagged</span>
      </div>
    </div>
  );
}

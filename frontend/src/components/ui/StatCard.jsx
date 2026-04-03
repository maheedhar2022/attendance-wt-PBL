export default function StatCard({ icon, label, value, bg = 'var(--bg-elevated)', iconColor = 'var(--text-primary)', textColor = 'var(--text-primary)' }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-sm)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: '48px', height: '48px',
        borderRadius: 'var(--radius-md)',
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: textColor, marginTop: '2px' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

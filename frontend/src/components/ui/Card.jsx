export default function Card({ title, children, action, className = '' }) {
  return (
    <div className={`card ${className}`} style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-sm)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          {title && <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h2>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

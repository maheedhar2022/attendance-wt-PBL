export default function Table({ headers, children, emptyMessage = 'No data available' }) {
  return (
    <div style={{
      width: '100%',
      overflowX: 'auto',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-card)'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
        <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-light)' }}>
          <tr>
            {headers.map((header, i) => (
              <th key={i} style={{ 
                padding: '12px 16px', 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children || (
            <tr>
              <td colSpan={headers.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableRow({ children }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, style = {} }) {
  return (
    <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-primary)', ...style }}>
      {children}
    </td>
  );
}

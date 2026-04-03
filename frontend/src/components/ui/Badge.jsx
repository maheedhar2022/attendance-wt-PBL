export default function Badge({ variant = 'info', children }) {
  const getStyles = () => {
    switch (variant) {
      case 'success':
      case 'active':
      case 'present':
        return { background: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'danger':
      case 'absent':
        return { background: 'var(--danger-bg)', color: 'var(--danger-text)' };
      case 'warning':
      case 'late':
        return { background: 'var(--warning-bg)', color: 'var(--warning-text)' };
      case 'gray':
      case 'closed':
        return { background: 'var(--bg-elevated)', color: 'var(--text-muted)' };
      case 'info':
      default:
        return { background: 'var(--info-bg)', color: 'var(--info-text)' };
    }
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      ...getStyles()
    }}>
      {children}
    </span>
  );
}

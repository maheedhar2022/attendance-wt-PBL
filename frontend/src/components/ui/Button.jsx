export default function Button({ children, onClick, variant = 'primary', size = 'default', disabled = false, className = '' }) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
  };

  const getVariantStyles = () => {
    switch(variant) {
      case 'primary': return { background: 'var(--accent)', color: 'white' };
      case 'outline': return { background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-primary)' };
      case 'danger': return { background: 'var(--danger)', color: 'white' };
      case 'success': return { background: 'var(--success)', color: 'white' };
      case 'ghost': return { background: 'transparent', color: 'var(--text-primary)' };
      default: return { background: 'var(--bg-elevated)', color: 'var(--text-primary)' };
    }
  };

  const getSizeStyles = () => {
    switch(size) {
      case 'sm': return { padding: '6px 12px', fontSize: '0.8rem' };
      case 'lg': return { padding: '12px 24px', fontSize: '1rem' };
      default: return { padding: '8px 16px', fontSize: '0.9rem' };
    }
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={className}
      style={{ ...baseStyles, ...getVariantStyles(), ...getSizeStyles() }}
      onMouseEnter={(e) => {
        if (!disabled) {
          if (variant === 'primary') e.currentTarget.style.background = 'var(--accent-hover)';
          if (variant === 'outline') e.currentTarget.style.background = 'var(--bg-elevated)';
          if (variant === 'ghost') e.currentTarget.style.background = 'var(--bg-elevated)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, getVariantStyles());
        }
      }}
    >
      {children}
    </button>
  );
}

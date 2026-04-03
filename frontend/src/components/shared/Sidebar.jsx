import { NavLink } from 'react-router-dom';

export default function Sidebar({ user, navItems, hasLive }) {
  return (
    <aside style={{ 
      width: '260px', 
      background: 'var(--bg-sidebar)', 
      borderRight: '1px solid var(--border-light)',
      display: 'flex', 
      flexDirection: 'column',
      padding: '24px 0'
    }}>
      <div style={{ padding: '0 24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            AX
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>AttendX</span>
        </div>
      </div>

      <div style={{ padding: '0 24px', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {user?.role === 'instructor' ? 'Instructor Portal' : 'Student Portal'}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 16px', flex: 1 }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 16px', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', fontSize: '0.9rem', fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.2s ease',
              position: 'relative'
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ fontSize: '1.1rem', opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
                {item.isSession && hasLive && (
                  <span style={{ position: 'absolute', right: 16, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

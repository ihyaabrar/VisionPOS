import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

function VisionPOSLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sidebarLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C6FF" />
          <stop offset="100%" stopColor="#7B2FF7" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#sidebarLogoGrad)" />
      <circle cx="35" cy="28" r="5" fill="white" opacity="0.8" />
      <circle cx="52" cy="28" r="5" fill="white" opacity="0.8" />
      <path d="M20 55 L42 75 L80 35" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface NavItem {
  to: string
  icon: string
  label: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard', adminOnly: true },
  { to: '/cashier', icon: '🛒', label: 'Kasir' },
  { to: '/inventory', icon: '📦', label: 'Inventaris', adminOnly: true },
  { to: '/history', icon: '📋', label: 'Riwayat', adminOnly: true },
  { to: '/dataset', icon: '📷', label: 'Dataset', adminOnly: true },
  { to: '/model', icon: '🤖', label: 'Model AI', adminOnly: true },
  { to: '/settings', icon: '⚙️', label: 'Pengaturan', adminOnly: true },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 16px',
    borderRadius: 12,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#7B2FF7' : '#64748b',
    background: isActive ? '#f3f0ff' : 'transparent',
    transition: 'all 0.15s',
    marginBottom: 2,
  })

  return (
    <div style={{
      width: 220,
      minHeight: '100vh',
      background: '#fff',
      borderRight: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 24px' }}>
        <VisionPOSLogo />
        <div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Vision</span>
          <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #00C6FF, #7B2FF7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>POS</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => linkStyle(isActive)}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 12px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00C6FF, #7B2FF7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
          }}>
            {user?.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '10px', borderRadius: 10, border: 'none',
            background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
          }}
        >
          🚪 Keluar
        </button>
      </div>
    </div>
  )
}

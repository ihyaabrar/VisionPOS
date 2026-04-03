import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const adminLinks = [
  { to: '/cashier', label: 'Kasir' },
  { to: '/inventory', label: 'Inventori' },
  { to: '/history', label: 'Riwayat' },
  { to: '/dataset', label: 'Dataset' },
  { to: '/model', label: 'Model' },
  { to: '/settings', label: 'Pengaturan' },
]

const kasirLinks = [
  { to: '/cashier', label: 'Kasir' },
]

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const links = user?.role === 'admin' ? adminLinks : kasirLinks

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', background: '#1a1a2e', color: '#fff' }}>
      <span style={{ fontWeight: 'bold', marginRight: 8 }}>VisionPOS</span>

      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          style={{ color: '#ccc', textDecoration: 'none' }}
        >
          {link.label}
        </Link>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <span style={{ fontSize: 14 }}>
            {user.username} <em style={{ opacity: 0.7 }}>({user.role})</em>
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{ padding: '4px 12px', cursor: 'pointer', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4 }}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

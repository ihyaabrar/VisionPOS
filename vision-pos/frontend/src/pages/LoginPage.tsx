import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Logo VisionPOS SVG inline
function VisionPOSLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C6FF" />
          <stop offset="100%" stopColor="#7B2FF7" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#logoGrad)" />
      <circle cx="35" cy="28" r="5" fill="white" opacity="0.8" />
      <circle cx="52" cy="28" r="5" fill="white" opacity="0.8" />
      <path d="M20 55 L42 75 L80 35" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      const role = useAuthStore.getState().user?.role
      navigate(role === 'kasir' ? '/cashier' : '/dashboard')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Login gagal. Periksa username dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        width: 420,
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        padding: '48px 40px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <VisionPOSLogo size={52} />
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>
                Vision
              </span>
              <span style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #00C6FF, #7B2FF7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                POS
              </span>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Smart Checkout System</p>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>Selamat Datang</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 28px' }}>Masuk ke akun Anda untuk melanjutkan</p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Masukkan username"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
                background: '#f8fafc',
              }}
              onFocus={(e) => e.target.style.borderColor = '#7B2FF7'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan password"
                style={{
                  width: '100%', padding: '12px 44px 12px 14px', borderRadius: 10,
                  border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box', background: '#f8fafc',
                }}
                onFocus={(e) => e.target.style.borderColor = '#7B2FF7'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16,
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px', borderRadius: 10, border: 'none', marginTop: 4,
              background: loading ? '#c4b5fd' : 'linear-gradient(135deg, #00C6FF, #7B2FF7)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(123,47,247,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#94a3b8' }}>
          VisionPOS v1.0 · Smart Checkout with AI
        </p>
      </div>
    </div>
  )
}

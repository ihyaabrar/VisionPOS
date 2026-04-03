import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      // user state updated after login — read from store
      const role = useAuthStore.getState().user?.role
      if (role === 'kasir') {
        navigate('/cashier')
      } else {
        navigate('/inventory')
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Login gagal. Periksa username dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleSubmit} style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>VisionPOS — Login</h2>

        {error && (
          <div style={{ color: 'red', background: '#fee', padding: '8px 12px', borderRadius: 4, fontSize: 14 }}>
            {error}
          </div>
        )}

        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px', boxSizing: 'border-box' }}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px', boxSizing: 'border-box' }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px', marginTop: 8, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </form>
    </div>
  )
}

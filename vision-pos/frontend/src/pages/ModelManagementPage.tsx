import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import client from '../api/client'
import type { ModelInfo } from '../types'

interface ModelInfoResponse extends ModelInfo {
  is_loaded: boolean
}

interface ReloadLog {
  timestamp: string
  path: string
  success: boolean
  message: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function ModelManagementPage() {
  const user = useAuthStore((s) => s.user)
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reload modal
  const [showReload, setShowReload] = useState(false)
  const [reloadPath, setReloadPath] = useState('')
  const [reloading, setReloading] = useState(false)
  const [reloadError, setReloadError] = useState<string | null>(null)

  // Activity log
  const [logs, setLogs] = useState<ReloadLog[]>([])

  const loadModelInfo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await client.get<ModelInfoResponse>('/model/info')
      setModelInfo(res.data)
    } catch {
      setError('Gagal memuat info model.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadModelInfo()
  }, [loadModelInfo])

  async function handleReload() {
    if (!reloadPath.trim()) {
      setReloadError('Path model tidak boleh kosong.')
      return
    }
    setReloading(true)
    setReloadError(null)
    const ts = new Date().toISOString()
    try {
      const res = await client.post<{ success: boolean; message: string }>('/model/reload', { path: reloadPath.trim() })
      setLogs(prev => [{ timestamp: ts, path: reloadPath.trim(), success: true, message: res.data.message }, ...prev])
      setShowReload(false)
      setReloadPath('')
      await loadModelInfo()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Gagal reload model.'
      setReloadError(msg)
      setLogs(prev => [{ timestamp: ts, path: reloadPath.trim(), success: false, message: msg }, ...prev])
    } finally {
      setReloading(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
        Halaman ini hanya dapat diakses oleh Admin.
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Manajemen Model</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Info dan reload model AI yang aktif</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={loadModelInfo}
            disabled={loading}
            style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}
          >
            {loading ? 'Memuat...' : '↻ Refresh'}
          </button>
          <button
            onClick={() => { setShowReload(true); setReloadError(null) }}
            style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Reload Model
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Model Info Card */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Model Aktif</h2>
          {modelInfo && (
            <span style={{
              padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              background: modelInfo.is_loaded ? '#dcfce7' : '#fee2e2',
              color: modelInfo.is_loaded ? '#16a34a' : '#dc2626',
            }}>
              {modelInfo.is_loaded ? '● Dimuat' : '○ Tidak Dimuat'}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ color: '#9ca3af', fontSize: 14, padding: '20px 0' }}>Memuat info model...</div>
        ) : modelInfo ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Nama File', value: modelInfo.filename ?? '—' },
              { label: 'Format', value: modelInfo.format ? modelInfo.format.toUpperCase() : '—' },
              { label: 'Waktu Dimuat', value: modelInfo.loadedAt ? formatDate(modelInfo.loadedAt) : '—' },
              { label: 'Ukuran File', value: modelInfo.fileSizeKb ? `${modelInfo.fileSizeKb.toFixed(1)} KB` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#9ca3af', fontSize: 14 }}>Tidak ada info model tersedia.</div>
        )}
      </div>

      {/* Activity Log */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#111827' }}>Log Aktivitas Reload</h2>
        {logs.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 14, padding: '16px 0' }}>Belum ada aktivitas reload.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map((log, i) => (
              <div key={i} style={{
                padding: '12px 16px', borderRadius: 8,
                background: log.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${log.success ? '#bbf7d0' : '#fecaca'}`,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 16 }}>{log.success ? '✓' : '✗'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: log.success ? '#16a34a' : '#dc2626' }}>{log.message}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{log.path}</p>
                </div>
                <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reload Modal */}
      {showReload && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => !reloading && setShowReload(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Reload Model</h2>
              <button onClick={() => !reloading && setShowReload(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>Path Model Baru</label>
              <input
                type="text"
                value={reloadPath}
                onChange={e => setReloadPath(e.target.value)}
                placeholder="Contoh: models/best_v2.pt"
                disabled={reloading}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
              />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9ca3af' }}>Path relatif terhadap direktori backend.</p>
            </div>

            {reloadError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', marginBottom: 14, color: '#dc2626', fontSize: 13 }}>
                {reloadError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => !reloading && setShowReload(false)}
                disabled={reloading}
                style={{ padding: '9px 18px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}
              >
                Batal
              </button>
              <button
                onClick={handleReload}
                disabled={reloading}
                style={{ padding: '9px 18px', borderRadius: 7, border: 'none', background: reloading ? '#9ca3af' : '#2563eb', color: '#fff', cursor: reloading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                {reloading ? 'Memuat...' : 'Reload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

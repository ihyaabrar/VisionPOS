import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useCamera } from '../hooks/useCamera'
import { getItems } from '../api/inventory'
import client from '../api/client'
import type { Item } from '../types'

export default function DatasetPage() {
  const user = useAuthStore((s) => s.user)
  const { videoRef, canvasRef, isActive, error: camError, startCamera, stopCamera, captureFrame } = useCamera()

  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState('')
  const [manualId, setManualId] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [captureMsg, setCaptureMsg] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const effectiveItemId = selectedItemId || manualId.trim()

  // Load inventory items
  useEffect(() => {
    getItems()
      .then(res => setItems(res.data))
      .catch(() => setLoadError('Gagal memuat daftar barang.'))
  }, [])

  // Load count when item changes
  const loadCount = useCallback(async (itemId: string) => {
    if (!itemId) { setCount(null); return }
    try {
      const res = await client.get<{ item_id: string; count: number }>(`/dataset/${itemId}/count`)
      setCount(res.data.count)
    } catch {
      setCount(null)
    }
  }, [])

  useEffect(() => {
    loadCount(effectiveItemId)
  }, [effectiveItemId, loadCount])

  async function handleCapture() {
    if (!effectiveItemId) {
      setCaptureMsg('Pilih atau masukkan ID barang terlebih dahulu.')
      return
    }
    if (!isActive) {
      setCaptureMsg('Aktifkan kamera terlebih dahulu.')
      return
    }
    const frame = captureFrame()
    if (!frame) {
      setCaptureMsg('Gagal mengambil frame dari kamera.')
      return
    }
    setCapturing(true)
    setCaptureMsg(null)
    try {
      const res = await client.post<{ saved: boolean; path: string; count: number }>('/dataset/capture', {
        item_id: effectiveItemId,
        data: frame,
      })
      setCount(res.data.count)
      setCaptureMsg(`✓ Gambar tersimpan. Total: ${res.data.count} gambar.`)
    } catch {
      setCaptureMsg('Gagal menyimpan gambar.')
    } finally {
      setCapturing(false)
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
    <div style={{ padding: '24px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Dataset</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Tangkap gambar untuk dataset pelatihan model</p>
      </div>

      {loadError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
          {loadError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Left: Camera */}
        <div style={{ flex: '1 1 480px', background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Live Feed Kamera</h2>
            <span style={{
              fontSize: 12, padding: '2px 10px', borderRadius: 12,
              background: isActive ? '#16a34a' : '#6b7280', color: '#fff',
            }}>
              {isActive ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>

          <div style={{ background: '#111', borderRadius: 8, overflow: 'hidden', marginBottom: 12, position: 'relative', aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: isActive ? 'block' : 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {!isActive && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
                Kamera belum aktif
              </div>
            )}
          </div>

          {camError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', marginBottom: 10, color: '#dc2626', fontSize: 13 }}>
              {camError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {!isActive ? (
              <button
                onClick={startCamera}
                style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Aktifkan Kamera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', background: '#6b7280', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Matikan Kamera
              </button>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Item selector */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#111827' }}>Pilih Barang</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 4 }}>Dari Inventaris</label>
                <select
                  value={selectedItemId}
                  onChange={e => { setSelectedItemId(e.target.value); setManualId('') }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
                >
                  <option value="">-- Pilih barang --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.id})</option>
                  ))}
                </select>
              </div>
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>atau</div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 4 }}>ID Barang Manual</label>
                <input
                  type="text"
                  value={manualId}
                  onChange={e => { setManualId(e.target.value); setSelectedItemId('') }}
                  placeholder="Ketik ID barang..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Counter */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>Gambar Tersimpan</p>
            <p style={{ margin: 0, fontSize: 40, fontWeight: 800, color: '#2563eb' }}>
              {effectiveItemId ? (count ?? '—') : '—'}
            </p>
            {effectiveItemId && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>untuk "{effectiveItemId}"</p>
            )}
          </div>

          {/* Capture button */}
          <button
            onClick={handleCapture}
            disabled={capturing || !isActive || !effectiveItemId}
            style={{
              padding: '14px 0', borderRadius: 8, border: 'none',
              background: (capturing || !isActive || !effectiveItemId) ? '#9ca3af' : '#16a34a',
              color: '#fff', cursor: (capturing || !isActive || !effectiveItemId) ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700,
            }}
          >
            {capturing ? 'Menyimpan...' : '📷 Tangkap Gambar'}
          </button>

          {captureMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 7, fontSize: 13,
              background: captureMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${captureMsg.startsWith('✓') ? '#bbf7d0' : '#fecaca'}`,
              color: captureMsg.startsWith('✓') ? '#16a34a' : '#dc2626',
            }}>
              {captureMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

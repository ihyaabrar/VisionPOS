import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import client from '../api/client'

interface ConfigForm {
  confidence_threshold: string
  dedup_window_seconds: string
  idle_timeout_minutes: string
  default_min_stock: string
}

interface ConfigFormErrors {
  confidence_threshold?: string
  dedup_window_seconds?: string
  idle_timeout_minutes?: string
  default_min_stock?: string
}

const DEFAULTS: ConfigForm = {
  confidence_threshold: '0.70',
  dedup_window_seconds: '2.0',
  idle_timeout_minutes: '30',
  default_min_stock: '5',
}

function validate(form: ConfigForm): ConfigFormErrors {
  const errors: ConfigFormErrors = {}
  const ct = parseFloat(form.confidence_threshold)
  if (isNaN(ct) || ct < 0 || ct > 1) {
    errors.confidence_threshold = 'Harus antara 0.0 dan 1.0'
  }
  const dw = parseFloat(form.dedup_window_seconds)
  if (isNaN(dw) || dw <= 0) {
    errors.dedup_window_seconds = 'Harus lebih dari 0'
  }
  const it = parseInt(form.idle_timeout_minutes)
  if (isNaN(it) || it <= 0) {
    errors.idle_timeout_minutes = 'Harus lebih dari 0'
  }
  const ms = parseInt(form.default_min_stock)
  if (isNaN(ms) || ms < 0) {
    errors.default_min_stock = 'Harus 0 atau lebih'
  }
  return errors
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState<ConfigForm>(DEFAULTS)
  const [errors, setErrors] = useState<ConfigFormErrors>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    client.get<Record<string, unknown>>('/config')
      .then(res => {
        const data = res.data
        const model = (data.model as Record<string, unknown>) ?? {}
        const camera = (data.camera as Record<string, unknown>) ?? {}
        const transaction = (data.transaction as Record<string, unknown>) ?? {}
        const inventory = (data.inventory as Record<string, unknown>) ?? {}
        setForm({
          confidence_threshold: String(model.confidence_threshold ?? DEFAULTS.confidence_threshold),
          dedup_window_seconds: String(camera.dedup_window_seconds ?? DEFAULTS.dedup_window_seconds),
          idle_timeout_minutes: String(transaction.idle_timeout_minutes ?? DEFAULTS.idle_timeout_minutes),
          default_min_stock: String(inventory.default_min_stock ?? DEFAULTS.default_min_stock),
        })
      })
      .catch(() => {/* keep defaults */})
      .finally(() => setLoading(false))
  }, [])

  function handleChange(field: keyof ConfigForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear field error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    setSaveMsg(null)
    setSaveError(null)
  }

  async function handleSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    setSaveMsg(null)
    setSaveError(null)
    try {
      await client.put('/config', {
        model: { confidence_threshold: parseFloat(form.confidence_threshold) },
        camera: { dedup_window_seconds: parseFloat(form.dedup_window_seconds) },
        transaction: { idle_timeout_minutes: parseInt(form.idle_timeout_minutes) },
        inventory: { default_min_stock: parseInt(form.default_min_stock) },
      })
      setSaveMsg('Konfigurasi berhasil disimpan.')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: { errors?: string[] } | string } } })?.response?.data?.detail
      if (detail && typeof detail === 'object' && detail.errors) {
        setSaveError(detail.errors.join('; '))
      } else if (typeof detail === 'string') {
        setSaveError(detail)
      } else {
        setSaveError('Gagal menyimpan konfigurasi.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
        Halaman ini hanya dapat diakses oleh Admin.
      </div>
    )
  }

  const fields: { key: keyof ConfigForm; label: string; desc: string; type: 'number'; step?: string; min?: string }[] = [
    { key: 'confidence_threshold', label: 'Confidence Threshold', desc: 'Ambang batas kepercayaan deteksi (0.0 – 1.0)', type: 'number', step: '0.01', min: '0' },
    { key: 'dedup_window_seconds', label: 'Dedup Window (detik)', desc: 'Jendela waktu deduplikasi deteksi (> 0)', type: 'number', step: '0.1', min: '0.1' },
    { key: 'idle_timeout_minutes', label: 'Idle Timeout (menit)', desc: 'Batas waktu transaksi tidak aktif (> 0)', type: 'number', step: '1', min: '1' },
    { key: 'default_min_stock', label: 'Min Stok Default', desc: 'Stok minimum default untuk barang baru (≥ 0)', type: 'number', step: '1', min: '0' },
  ]

  return (
    <div style={{ padding: '24px 32px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Pengaturan Sistem</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Konfigurasi parameter sistem VisionPOS</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: 15 }}>
          Memuat konfigurasi...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {fields.map(({ key, label, desc, type, step, min }) => (
                <div key={key}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#111827', display: 'block', marginBottom: 4 }}>
                    {label}
                  </label>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6b7280' }}>{desc}</p>
                  <input
                    type={type}
                    step={step}
                    min={min}
                    value={form[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 7, fontSize: 14, boxSizing: 'border-box',
                      border: `1px solid ${errors[key] ? '#fca5a5' : '#d1d5db'}`,
                      background: errors[key] ? '#fef2f2' : '#fff',
                      outline: 'none',
                    }}
                  />
                  {errors[key] && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{errors[key]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {saveMsg && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 14, color: '#16a34a', fontSize: 14 }}>
              {saveMsg}
            </div>
          )}
          {saveError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 14, color: '#dc2626', fontSize: 14 }}>
              {saveError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
              background: saving ? '#9ca3af' : '#2563eb', color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </button>
        </form>
      )}
    </div>
  )
}

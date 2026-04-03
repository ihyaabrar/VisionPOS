import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import * as reportsApi from '../api/reports'
import type { TransactionHistoryParams } from '../api/reports'
import type { Transaction } from '../types'

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'active', label: 'Aktif' },
]

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: '#dcfce7', color: '#16a34a', label: 'Selesai' },
  cancelled: { bg: '#fee2e2', color: '#dc2626', label: 'Dibatalkan' },
  active: { bg: '#dbeafe', color: '#2563eb', label: 'Aktif' },
}

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TransactionHistoryPage() {
  const user = useAuthStore((s) => s.user)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')

  // Detail modal
  const [selected, setSelected] = useState<Transaction | null>(null)

  const buildParams = useCallback((): TransactionHistoryParams => {
    const p: TransactionHistoryParams = {}
    if (from) p.from = from
    if (to) p.to = to
    if (status) p.status = status
    return p
  }, [from, to, status])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await reportsApi.getTransactionHistory(buildParams())
      setTransactions(res.data)
    } catch {
      setError('Gagal memuat riwayat transaksi.')
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  async function handleExportCSV() {
    setExporting(true)
    try {
      const res = await reportsApi.exportReportsCSV(buildParams())
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transaksi_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Gagal mengekspor CSV.')
    } finally {
      setExporting(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
        Halaman ini hanya dapat diakses oleh Admin.
      </div>
    )
  }

  const badge = selected ? (STATUS_BADGE[selected.status] ?? { bg: '#f3f4f6', color: '#374151', label: selected.status }) : null

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Riwayat Transaksi</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Lihat dan ekspor riwayat transaksi</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          style={{
            padding: '9px 18px', borderRadius: 7, border: 'none',
            background: exporting ? '#9ca3af' : '#16a34a', color: '#fff',
            cursor: exporting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          {exporting ? 'Mengekspor...' : '⬇ Ekspor CSV'}
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 8, padding: '16px 20px',
        marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Dari Tanggal</label>
          <input
            type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Sampai Tanggal</label>
          <input
            type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Status</label>
          <select
            value={status} onChange={e => setStatus(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button
          onClick={loadHistory}
          style={{
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          Terapkan Filter
        </button>
        <button
          onClick={() => { setFrom(''); setTo(''); setStatus('') }}
          style={{
            padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db',
            background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 14,
          }}
        >
          Reset
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: 15 }}>
          Memuat riwayat transaksi...
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['ID Transaksi', 'Waktu Mulai', 'Status', 'Total', 'Metode Bayar', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : transactions.map((tx, i) => {
                const b = STATUS_BADGE[tx.status] ?? { bg: '#f3f4f6', color: '#374151', label: tx.status }
                return (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                    onClick={() => setSelected(tx)}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#374151' }}>{tx.id}</td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>{formatDate(tx.startedAt)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, background: b.bg, color: b.color, fontSize: 12, fontWeight: 600 }}>
                        {b.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{formatRupiah(tx.cart.total)}</td>
                    <td style={{ padding: '12px 16px', color: '#374151', textTransform: 'capitalize' }}>
                      {tx.payment?.method ?? '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(tx) }}
                        style={{ padding: '4px 12px', borderRadius: 5, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151' }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && badge && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: 28, width: 520, maxWidth: '95vw',
              maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Detail Transaksi</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Status</p>
                <span style={{ padding: '3px 10px', borderRadius: 12, background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 600 }}>{badge.label}</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Waktu Mulai</p>
                <p style={{ margin: 0, fontSize: 14, color: '#111827' }}>{formatDate(selected.startedAt)}</p>
              </div>
              {selected.completedAt && (
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Waktu Selesai</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#111827' }}>{formatDate(selected.completedAt)}</p>
                </div>
              )}
              {selected.payment && (
                <>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Metode Bayar</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#111827', textTransform: 'capitalize' }}>{selected.payment.method}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Diterima</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#111827' }}>{formatRupiah(selected.payment.received)}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Kembalian</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#111827' }}>{formatRupiah(selected.payment.change)}</p>
                  </div>
                </>
              )}
            </div>

            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#374151' }}>Item ({selected.cart.items.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Barang', 'Qty', 'Subtotal'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.cart.items.map((ci, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{ci.item.name}</td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>{ci.quantity}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#111827' }}>{formatRupiah(ci.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#2563eb' }}>{formatRupiah(selected.cart.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

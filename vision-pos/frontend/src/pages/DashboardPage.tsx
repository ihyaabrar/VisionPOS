import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import * as reportsApi from '../api/reports'

interface DailySummary {
  date: string
  total_revenue: number
  transaction_count: number
  top_items: Array<{ item_id: string; item_name: string; total_qty: number; total_revenue: number }>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [summary, setSummary] = useState<DailySummary | null>(null)

  useEffect(() => {
    reportsApi.getDailySummary()
      .then(res => setSummary(res.data))
      .catch(() => {})
  }, [])

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
          Selamat datang, {user?.username} 👋
        </h1>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>{today}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="💰" label="Pendapatan Hari Ini" value={fmt(summary?.total_revenue ?? 0)} color="#f0fdf4" />
        <StatCard icon="🧾" label="Transaksi Hari Ini" value={String(summary?.transaction_count ?? 0)} color="#eff6ff" />
        <StatCard icon="📦" label="Item Terlaris" value={summary?.top_items?.[0]?.item_name ?? '—'} color="#fdf4ff" />
        <StatCard icon="🤖" label="Status AI" value="Siap" color="#fff7ed" />
      </div>

      {/* Top Items */}
      {summary && summary.top_items.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Item Terlaris Hari Ini</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['#', 'Nama Barang', 'Qty Terjual', 'Total'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.top_items.slice(0, 5).map((item, i) => (
                <tr key={item.item_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1e293b' }}>{item.item_name}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{item.total_qty}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#7B2FF7' }}>{fmt(item.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!summary && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', color: '#94a3b8', border: '1px solid #f1f5f9' }}>
          Belum ada data transaksi hari ini.
        </div>
      )}
    </div>
  )
}

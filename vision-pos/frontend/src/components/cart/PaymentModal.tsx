import { useState } from 'react'

interface PaymentModalProps {
  total: number
  onConfirm: (method: string, received: number) => void
  onCancel: () => void
  isLoading?: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function PaymentModal({ total, onConfirm, onCancel, isLoading }: PaymentModalProps) {
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash')
  const [received, setReceived] = useState('')

  const receivedNum = parseFloat(received) || 0
  const change = receivedNum - total
  const canConfirm = receivedNum >= total && !isLoading

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 360,
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Pembayaran</h2>

        {/* Total */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 14, color: '#166534' }}>Total Pembayaran</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>{fmt(total)}</span>
        </div>

        {/* Metode */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#374151' }}>
            Metode Pembayaran
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['cash', 'transfer'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 6,
                  border: `2px solid ${method === m ? '#2563eb' : '#d1d5db'}`,
                  background: method === m ? '#eff6ff' : '#fff',
                  color: method === m ? '#1d4ed8' : '#374151',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: method === m ? 600 : 400,
                }}
              >
                {m === 'cash' ? 'Tunai' : 'Transfer'}
              </button>
            ))}
          </div>
        </div>

        {/* Jumlah diterima */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#374151' }}>
            Jumlah Diterima
          </label>
          <input
            type="number"
            value={received}
            onChange={(e: { target: { value: string } }) => setReceived(e.target.value)}
            placeholder="0"
            min={0}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: `1px solid ${receivedNum > 0 && receivedNum < total ? '#ef4444' : '#d1d5db'}`,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Kembalian */}
        <div
          style={{
            background: change >= 0 && receivedNum > 0 ? '#f0fdf4' : '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#6b7280' }}>Kembalian</span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: change >= 0 && receivedNum > 0 ? '#15803d' : '#9ca3af',
            }}
          >
            {receivedNum > 0 && change >= 0 ? fmt(change) : '-'}
          </span>
        </div>

        {/* Tombol */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Batal
          </button>

          <button
            onClick={() => canConfirm && onConfirm(method, receivedNum)}
            disabled={!canConfirm}
            style={{
              flex: 2,
              padding: '10px 0',
              borderRadius: 6,
              border: 'none',
              background: canConfirm ? '#16a34a' : '#9ca3af',
              color: '#fff',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Memproses...' : 'Konfirmasi Bayar'}
          </button>
        </div>
      </div>
    </div>
  )
}

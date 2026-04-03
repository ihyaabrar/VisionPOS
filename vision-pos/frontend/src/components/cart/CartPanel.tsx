import type { CartItem as CartItemType } from '../../types'
import { useCartStore } from '../../store/cartStore'
import CartItem from './CartItem'

interface CartPanelProps {
  onCheckout: () => void
  onRemoveItem: (itemId: string) => void
  onCancel: () => void
  isLoading?: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function CartPanel({ onCheckout, onRemoveItem, onCancel, isLoading }: CartPanelProps) {
  const { items, total } = useCartStore()
  const isEmpty = items.length === 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600,
          fontSize: 15,
          background: '#f9fafb',
        }}
      >
        Keranjang
      </div>

      {/* Item list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {isEmpty ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#9ca3af',
              fontSize: 14,
              padding: 24,
            }}
          >
            Keranjang kosong
          </div>
        ) : (
          items.map((ci: CartItemType) => (
            <CartItem key={ci.item.id} cartItem={ci} onRemove={onRemoveItem} />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <span style={{ fontWeight: 500, fontSize: 14 }}>Total</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{fmt(total)}</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Batal Transaksi
          </button>

          <button
            onClick={onCheckout}
            disabled={isEmpty || isLoading}
            style={{
              flex: 2,
              padding: '8px 0',
              borderRadius: 6,
              border: 'none',
              background: isEmpty || isLoading ? '#9ca3af' : '#16a34a',
              color: '#fff',
              cursor: isEmpty || isLoading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Bayar
          </button>
        </div>
      </div>
    </div>
  )
}

import type { CartItem as CartItemType } from '../../types'

interface CartItemProps {
  cartItem: CartItemType
  onRemove: (itemId: string) => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function CartItem({ cartItem, onRemove }: CartItemProps) {
  const { item, quantity, subtotal } = cartItem

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
          {fmt(item.price)} × {quantity}
        </div>
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
        {fmt(subtotal)}
      </div>

      <button
        onClick={() => onRemove(item.id)}
        title="Hapus item"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#ef4444',
          fontSize: 16,
          padding: '2px 6px',
          borderRadius: 4,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}

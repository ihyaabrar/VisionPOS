import type { Item } from '../../types'
import * as inventoryApi from '../../api/inventory'

interface ItemTableProps {
  items: Item[]
  onEdit: (item: Item) => void
  onDelete: (item: Item) => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

function isLowStock(item: Item): boolean {
  return item.stock <= item.minStock
}

async function handleExportCSV() {
  try {
    const res = await inventoryApi.exportInventoryCSV()
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventaris.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('Gagal mengekspor CSV')
  }
}

export default function ItemTable({ items, onEdit, onDelete }: ItemTableProps) {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: '#6b7280' }}>
          {items.length} barang terdaftar
        </span>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#fff',
            color: '#374151',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ⬇ Ekspor CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['ID', 'Nama', 'Harga', 'Stok', 'Min Stok', 'Status', 'Aksi'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#374151',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                  Belum ada barang
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const low = isLowStock(item)
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: low ? '#fffbeb' : '#fff',
                    }}
                  >
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontFamily: 'monospace' }}>{item.id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111827' }}>{item.name}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{fmt(item.price)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: low ? 700 : 400, color: low ? '#d97706' : '#374151' }}>
                      {item.stock}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{item.minStock}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {low ? (
                        <span
                          style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fcd34d',
                            borderRadius: 12,
                            padding: '2px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          ⚠ Stok Rendah
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                            borderRadius: 12,
                            padding: '2px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          ✓ Normal
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => onEdit(item)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 5,
                            border: '1px solid #2563eb',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 5,
                            border: '1px solid #ef4444',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

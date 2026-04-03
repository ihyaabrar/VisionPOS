import { useState, useEffect, useCallback } from 'react'
import type { Item } from '../types'
import * as inventoryApi from '../api/inventory'
import type { ItemCreate, ItemUpdate } from '../api/inventory'
import { useAuthStore } from '../store/authStore'
import ItemTable from '../components/inventory/ItemTable'
import ItemFormModal from '../components/inventory/ItemFormModal'

export default function InventoryPage() {
  const user = useAuthStore((s) => s.user)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [saving, setSaving] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await inventoryApi.getItems()
      setItems(res.data)
    } catch {
      setError('Gagal memuat daftar barang. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Admin only guard
  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
        Halaman ini hanya dapat diakses oleh Admin.
      </div>
    )
  }

  function openAdd() {
    setEditItem(null)
    setModalOpen(true)
  }

  function openEdit(item: Item) {
    setEditItem(item)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditItem(null)
  }

  async function handleSave(data: ItemCreate | ItemUpdate) {
    setSaving(true)
    try {
      if (editItem) {
        await inventoryApi.updateItem(editItem.id, data as ItemUpdate)
      } else {
        await inventoryApi.createItem(data as ItemCreate)
      }
      closeModal()
      await loadItems()
    } catch {
      throw new Error('Gagal menyimpan barang')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: Item) {
    const confirmed = window.confirm(`Hapus barang "${item.name}" (${item.id})?`)
    if (!confirmed) return
    try {
      await inventoryApi.deleteItem(item.id)
      await loadItems()
    } catch {
      setError(`Gagal menghapus barang "${item.name}".`)
    }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Inventaris</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Kelola daftar barang dan stok</p>
        </div>
        <button
          onClick={openAdd}
          style={{
            padding: '9px 18px',
            borderRadius: 7,
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + Tambah Barang
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            color: '#dc2626',
            fontSize: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: 15 }}>
          Memuat data inventaris...
        </div>
      ) : (
        <ItemTable items={items} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {/* Modal */}
      {modalOpen && (
        <ItemFormModal
          item={editItem}
          onSave={handleSave}
          onCancel={closeModal}
          isLoading={saving}
        />
      )}
    </div>
  )
}

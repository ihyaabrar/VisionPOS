import { useState, useEffect } from 'react'
import type { Item } from '../../types'
import type { ItemCreate, ItemUpdate } from '../../api/inventory'

interface ItemFormModalProps {
  item?: Item | null  // null/undefined = mode tambah, Item = mode edit
  onSave: (data: ItemCreate | ItemUpdate) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

interface FormState {
  id: string
  name: string
  price: string
  stock: string
  min_stock: string
  class_id: string
}

const emptyForm: FormState = { id: '', name: '', price: '', stock: '', min_stock: '0', class_id: '' }

function validate(form: FormState, isEdit: boolean): string | null {
  if (!isEdit && !form.id.trim()) return 'ID barang wajib diisi'
  if (!form.name.trim()) return 'Nama barang wajib diisi'
  if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0) return 'Harga tidak valid'
  if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0) return 'Stok tidak valid'
  if (form.min_stock === '' || isNaN(Number(form.min_stock)) || Number(form.min_stock) < 0) return 'Min stok tidak valid'
  return null
}

export default function ItemFormModal({ item, onSave, onCancel, isLoading }: ItemFormModalProps) {
  const isEdit = !!item
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (item) {
      setForm({
        id: item.id,
        name: item.name,
        price: String(item.price),
        stock: String(item.stock),
        min_stock: String(item.minStock),
        class_id: item.classId != null ? String(item.classId) : '',
      })
    } else {
      setForm(emptyForm)
    }
    setError(null)
  }, [item])

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    const err = validate(form, isEdit)
    if (err) { setError(err); return }
    setError(null)

    const payload = {
      ...(isEdit ? {} : { id: form.id.trim() }),
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      min_stock: Number(form.min_stock),
      ...(form.class_id !== '' ? { class_id: Number(form.class_id) } : {}),
    }

    await onSave(payload as ItemCreate | ItemUpdate)
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: '#fff',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: '#374151',
  }

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
          width: 420,
          maxWidth: '92vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
          {isEdit ? 'Edit Barang' : 'Tambah Barang'}
        </h2>

        {/* ID */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>ID Barang</label>
          <input
            style={{ ...inputStyle, background: isEdit ? '#f9fafb' : '#fff', color: isEdit ? '#6b7280' : '#111827' }}
            value={form.id}
            onChange={(e) => set('id', e.target.value)}
            disabled={isEdit}
            placeholder="Contoh: ITEM001"
          />
        </div>

        {/* Nama */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nama Barang</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Nama barang"
          />
        </div>

        {/* Harga */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Harga (Rp)</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Stok & Min Stok */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Stok</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => set('stock', e.target.value)}
              placeholder="0"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Min Stok</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={form.min_stock}
              onChange={(e) => set('min_stock', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {/* Class ID (opsional) */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            Class ID <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opsional)</span>
          </label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={form.class_id}
            onChange={(e) => set('class_id', e.target.value)}
            placeholder="Kosongkan jika tidak ada"
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 16,
              color: '#dc2626',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

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
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              flex: 2,
              padding: '10px 0',
              borderRadius: 6,
              border: 'none',
              background: isLoading ? '#9ca3af' : '#2563eb',
              color: '#fff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

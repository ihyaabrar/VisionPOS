import { useState, useEffect, useRef, useCallback } from 'react'
import type { Item } from '../../types'
import { searchItems } from '../../api/inventory'

interface ManualSearchProps {
  onItemSelect: (item: Item) => void
}

export default function ManualSearch({ onItemSelect }: ManualSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Item[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await searchItems(q)
      setResults(res.data)
      setIsOpen(true)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (item: Item) => {
    onItemSelect(item)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
          placeholder="Cari barang (nama / ID)..."
          style={{
            width: '100%',
            padding: '10px 36px 10px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {isLoading && (
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 12,
              color: '#9ca3af',
            }}
          >
            ⏳
          </span>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 100,
            maxHeight: 240,
            overflowY: 'auto',
            marginTop: 4,
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13 }}>
              Barang tidak ditemukan
            </div>
          ) : (
            results.map((item: Item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e: { currentTarget: HTMLDivElement }) => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={(e: { currentTarget: HTMLDivElement }) => (e.currentTarget.style.background = '#fff')}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>ID: {item.id}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  {fmt(item.price)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

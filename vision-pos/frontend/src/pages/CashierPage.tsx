import { useState, useCallback, useId, useEffect, useRef } from 'react'
import CameraFeed from '../components/camera/CameraFeed'
import CartPanel from '../components/cart/CartPanel'
import PaymentModal from '../components/cart/PaymentModal'
import ManualSearch from '../components/search/ManualSearch'
import { useTransaction } from '../hooks/useTransaction'
import { useDetectionWS } from '../hooks/useDetectionWS'
import { useCartStore } from '../store/cartStore'
import type { Item } from '../types'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 menit

export default function CashierPage() {
  const sessionId = useId()
  const [showPayment, setShowPayment] = useState(false)
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    transactionId,
    startTransaction,
    cancelTransaction,
    completeTransaction,
    addItemToCart,
    removeItemFromCart,
    isLoading,
    error,
  } = useTransaction()

  const { total, items } = useCartStore()

  // Reset idle timer setiap kali cart berubah atau transaksi aktif
  useEffect(() => {
    if (!transactionId) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      setShowIdleWarning(false)
      return
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setShowIdleWarning(true), IDLE_TIMEOUT_MS)
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [transactionId, items])

  const { isConnected, detections, sendFrame, connect, disconnect } = useDetectionWS({
    sessionId,
    transactionId,
  })

  // Mulai transaksi + koneksi WS saat pertama kali
  const handleStart = useCallback(async () => {
    await startTransaction()
    connect()
  }, [startTransaction, connect])

  const handleCancel = useCallback(async () => {
    setShowIdleWarning(false)
    await cancelTransaction('Dibatalkan oleh kasir')
    disconnect()
  }, [cancelTransaction, disconnect])

  const handleIdleContinue = useCallback(() => {
    setShowIdleWarning(false)
    // Reset timer dengan memicu ulang effect via dummy state tidak diperlukan —
    // effect sudah terikat ke `items`, cukup reset manual
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setShowIdleWarning(true), IDLE_TIMEOUT_MS)
  }, [])

  const handleIdleCancel = useCallback(async () => {
    setShowIdleWarning(false)
    await cancelTransaction('Timeout tidak aktif 30 menit')
    disconnect()
  }, [cancelTransaction, disconnect])

  const handleItemSelect = useCallback(
    async (item: Item) => {
      // Jika belum ada transaksi aktif, buat dulu
      if (!transactionId) {
        await startTransaction()
        connect()
      }
      await addItemToCart(item.id)
      // Update cart store langsung dengan data item
      useCartStore.getState().addItem(item)
    },
    [transactionId, startTransaction, connect, addItemToCart]
  )

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      await removeItemFromCart(itemId)
    },
    [removeItemFromCart]
  )

  const handleConfirmPayment = useCallback(
    async (method: string, received: number) => {
      await completeTransaction(method, received)
      setShowPayment(false)
      disconnect()
    },
    [completeTransaction, disconnect]
  )

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 56px)',
        gap: 16,
        padding: 16,
        background: '#f3f4f6',
        boxSizing: 'border-box',
      }}
    >
      {/* Panel Kiri — Kamera (60%) */}
      <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            padding: 16,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Kamera Deteksi</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Status WebSocket */}
              <span
                style={{
                  fontSize: 12,
                  padding: '2px 10px',
                  borderRadius: 12,
                  background: isConnected ? '#16a34a' : '#6b7280',
                  color: '#fff',
                }}
              >
                WS: {isConnected ? 'Terhubung' : 'Terputus'}
              </span>

              {/* Status Transaksi */}
              <span
                style={{
                  fontSize: 12,
                  padding: '2px 10px',
                  borderRadius: 12,
                  background: transactionId ? '#2563eb' : '#9ca3af',
                  color: '#fff',
                }}
              >
                {transactionId ? 'Transaksi Aktif' : 'Belum Ada Transaksi'}
              </span>
            </div>
          </div>

          <CameraFeed
            onFrame={transactionId ? sendFrame : undefined}
            detections={detections}
            width={640}
            height={360}
          />

          {/* Tombol mulai transaksi jika belum ada */}
          {!transactionId && (
            <button
              onClick={handleStart}
              disabled={isLoading}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: isLoading ? '#9ca3af' : '#2563eb',
                color: '#fff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
                alignSelf: 'flex-start',
              }}
            >
              {isLoading ? 'Memulai...' : 'Mulai Transaksi'}
            </button>
          )}

          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Panel Kanan — Search + Cart (40%) */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* ManualSearch */}
        <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
            Cari Barang Manual
          </h3>
          <ManualSearch onItemSelect={handleItemSelect} />
        </div>

        {/* CartPanel */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <CartPanel
            onCheckout={() => setShowPayment(true)}
            onRemoveItem={handleRemoveItem}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={total}
          onConfirm={handleConfirmPayment}
          onCancel={() => setShowPayment(false)}
          isLoading={isLoading}
        />
      )}

      {/* Idle Timeout Warning Dialog */}
      {showIdleWarning && (
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
              padding: 32,
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏰</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
              Transaksi Tidak Aktif
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
              Transaksi tidak aktif selama 30 menit. Lanjutkan atau batalkan?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={handleIdleContinue}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Lanjutkan
              </button>
              <button
                onClick={handleIdleCancel}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: '1px solid #dc2626',
                  background: '#fff',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

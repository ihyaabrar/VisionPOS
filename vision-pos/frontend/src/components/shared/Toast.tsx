import { useEffect } from 'react'
import { useToastStore } from '../../store/toastStore'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'warning'
  onClose: () => void
}

const BG: Record<ToastProps['type'], string> = {
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
}

function ToastItem({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 8,
        background: BG[type],
        color: '#fff',
        fontSize: 14,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        minWidth: 260,
        maxWidth: 380,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Tutup notifikasi"
      >
        ×
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
      }}
    >
      {toasts.map((t: { id: string; message: string; type: 'success' | 'error' | 'warning' }) => (
        <ToastItem
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => removeToast(t.id)}
        />
      ))}
    </div>
  )
}

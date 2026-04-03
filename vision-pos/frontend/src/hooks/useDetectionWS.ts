import { useRef, useState, useCallback, useEffect } from 'react'
import type { Detection, CartItem } from '../types'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

interface UseDetectionWSOptions {
  sessionId: string
  transactionId: string | null
  onDetection?: (detections: Detection[]) => void
}

interface UseDetectionWSReturn {
  isConnected: boolean
  detections: Detection[]
  sendFrame: (base64: string) => void
  connect: () => void
  disconnect: () => void
  error: string | null
}

export function useDetectionWS(options: UseDetectionWSOptions): UseDetectionWSReturn {
  const { sessionId, transactionId, onDetection } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const manualDisconnectRef = useRef(false)

  const [isConnected, setIsConnected] = useState(false)
  const [detections, setDetections] = useState<Detection[]>([])
  const [error, setError] = useState<string | null>(null)

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const connect = useCallback(() => {
    // Jangan buka koneksi baru jika sudah terbuka
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

    const token = useAuthStore.getState().token
    if (!token) return

    manualDisconnectRef.current = false

    const ws = new WebSocket(`ws://localhost:8000/ws/detection?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(event.data as string)
      } catch {
        return
      }

      if (msg.type === 'detection_result') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (msg.detections as any[]) ?? []
        const parsed: Detection[] = raw.map((d) => ({
          classId: d.class_id,
          itemId: d.item_id,
          itemName: d.item_name,
          confidence: d.confidence,
          bbox: d.bbox,
          addedToCart: d.added_to_cart,
        }))

        setDetections(parsed)

        // Tambahkan ke cart setiap item yang added_to_cart = true
        const addItem = useCartStore.getState().addItem
        for (const det of parsed) {
          if (det.addedToCart) {
            addItem({
              id: det.itemId,
              name: det.itemName,
              price: 0, // harga akan di-update via cart_updated
              stock: 0,
              minStock: 0,
              classId: det.classId,
              isActive: true,
            })
          }
        }

        onDetection?.(parsed)
      } else if (msg.type === 'cart_updated') {
        const serverCart = (msg.cart as { items: CartItem[]; total: number } | undefined)
        if (serverCart?.items) {
          useCartStore.getState().updateFromServer(serverCart.items)
        }
      } else if (msg.type === 'error') {
        const code = msg.code as string
        if (code === 'SESSION_EXPIRED') {
          disconnect()
          useAuthStore.getState().logout()
          window.location.href = '/login'
        } else {
          setError(msg.message as string ?? code)
        }
      }
    }

    ws.onerror = () => {
      setIsConnected(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null

      // Reconnect otomatis jika bukan disconnect manual
      if (!manualDisconnectRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
    }
  }, [disconnect, onDetection])

  const sendFrame = useCallback(
    (base64: string) => {
      if (!transactionId) return
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

      wsRef.current.send(
        JSON.stringify({
          type: 'frame',
          session_id: sessionId,
          transaction_id: transactionId,
          data: base64,
        })
      )
    },
    [sessionId, transactionId]
  )

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      manualDisconnectRef.current = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  return { isConnected, detections, sendFrame, connect, disconnect, error }
}

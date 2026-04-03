import { useState, useCallback } from 'react'
import * as api from '../api/transactions'
import { useCartStore } from '../store/cartStore'

interface UseTransactionReturn {
  transactionId: string | null
  startTransaction: () => Promise<void>
  cancelTransaction: (reason?: string) => Promise<void>
  completeTransaction: (method: string, received: number) => Promise<void>
  addItemToCart: (itemId: string, qty?: number) => Promise<void>
  removeItemFromCart: (itemId: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useTransaction(): UseTransactionReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { transactionId, setTransactionId, clear } = useCartStore()

  const startTransaction = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.createTransaction()
      setTransactionId(res.data.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memulai transaksi'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [setTransactionId])

  const addItemToCart = useCallback(
    async (itemId: string, qty = 1) => {
      if (!transactionId) return
      setIsLoading(true)
      setError(null)
      try {
        await api.addItem(transactionId, itemId, qty)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menambah item'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [transactionId]
  )

  const removeItemFromCart = useCallback(
    async (itemId: string) => {
      if (!transactionId) return
      setIsLoading(true)
      setError(null)
      try {
        await api.removeItem(transactionId, itemId)
        useCartStore.getState().removeItem(itemId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menghapus item'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [transactionId]
  )

  const completeTransaction = useCallback(
    async (method: string, received: number) => {
      if (!transactionId) return
      setIsLoading(true)
      setError(null)
      try {
        await api.completeTransaction(transactionId, method, received)
        clear()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menyelesaikan transaksi'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [transactionId, clear]
  )

  const cancelTransaction = useCallback(
    async (reason?: string) => {
      if (!transactionId) return
      setIsLoading(true)
      setError(null)
      try {
        await api.cancelTransaction(transactionId, reason)
        clear()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal membatalkan transaksi'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [transactionId, clear]
  )

  return {
    transactionId,
    startTransaction,
    cancelTransaction,
    completeTransaction,
    addItemToCart,
    removeItemFromCart,
    isLoading,
    error,
  }
}

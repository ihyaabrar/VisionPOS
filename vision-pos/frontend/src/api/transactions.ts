import client from './client'
import type { Transaction, Receipt } from '../types'

export const createTransaction = () =>
  client.post<Transaction>('/transactions')

export const getTransaction = (id: string) =>
  client.get<Transaction>(`/transactions/${id}`)

export const addItem = (txId: string, itemId: string, qty: number) =>
  client.post(`/transactions/${txId}/items`, { item_id: itemId, quantity: qty })

export const removeItem = (txId: string, itemId: string) =>
  client.delete(`/transactions/${txId}/items/${itemId}`)

export const completeTransaction = (txId: string, method: string, received: number) =>
  client.post(`/transactions/${txId}/complete`, { method, received })

export const cancelTransaction = (txId: string, reason?: string) =>
  client.post(`/transactions/${txId}/cancel`, { reason })

export const getReceipt = (txId: string) =>
  client.get<Receipt>(`/transactions/${txId}/receipt`)

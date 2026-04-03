import { create } from 'zustand'
import type { Item, CartItem } from '../types'

interface CartState {
  items: CartItem[]
  total: number
  transactionId: string | null
  addItem: (item: Item, qty?: number) => void
  removeItem: (itemId: string) => void
  updateFromServer: (serverCart: CartItem[]) => void
  clear: () => void
  setTransactionId: (id: string | null) => void
}

const calcTotal = (items: CartItem[]) =>
  items.reduce((sum, ci) => sum + ci.subtotal, 0)

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  transactionId: null,

  addItem: (item, qty = 1) =>
    set((state) => {
      const existing = state.items.find((ci) => ci.item.id === item.id)
      let items: CartItem[]
      if (existing) {
        items = state.items.map((ci) =>
          ci.item.id === item.id
            ? { ...ci, quantity: ci.quantity + qty, subtotal: (ci.quantity + qty) * item.price }
            : ci
        )
      } else {
        items = [...state.items, { item, quantity: qty, subtotal: qty * item.price }]
      }
      return { items, total: calcTotal(items) }
    }),

  removeItem: (itemId) =>
    set((state) => {
      const items = state.items.filter((ci) => ci.item.id !== itemId)
      return { items, total: calcTotal(items) }
    }),

  updateFromServer: (serverCart) =>
    set({ items: serverCart, total: calcTotal(serverCart) }),

  clear: () => set({ items: [], total: 0, transactionId: null }),

  setTransactionId: (id) => set({ transactionId: id }),
}))

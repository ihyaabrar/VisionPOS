import client from './client'
import type { Item } from '../types'

export interface ItemCreate {
  id: string
  name: string
  price: number
  stock: number
  min_stock?: number
  class_id?: number
}

export interface ItemUpdate {
  name: string
  price: number
  stock: number
  min_stock?: number
  class_id?: number
}

export const getItems = () =>
  client.get<Item[]>('/items')

export const searchItems = (q: string) =>
  client.get<Item[]>('/items/search', { params: { q } })

export const getItem = (id: string) =>
  client.get<Item>(`/items/${id}`)

export const createItem = (data: ItemCreate) =>
  client.post<Item>('/items', data)

export const updateItem = (id: string, data: ItemUpdate) =>
  client.put<Item>(`/items/${id}`, data)

export const deleteItem = (id: string) =>
  client.delete(`/items/${id}`)

export const exportInventoryCSV = () =>
  client.get('/items/export/csv', { responseType: 'blob' })

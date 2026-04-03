import client from './client'

export interface TransactionHistoryParams {
  from?: string
  to?: string
  cashier_id?: number
  status?: string
}

export const getTransactionHistory = (params?: TransactionHistoryParams) =>
  client.get('/reports/transactions', { params })

export const getDailySummary = (date?: string) =>
  client.get('/reports/daily', { params: { date } })

export const exportReportsCSV = (params?: TransactionHistoryParams) =>
  client.get('/reports/export/csv', { params, responseType: 'blob' })

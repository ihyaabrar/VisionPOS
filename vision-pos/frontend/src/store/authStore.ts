import { create } from 'zustand'
import type { User } from '../types'
import * as authApi from '../api/auth'
import client from '../api/client'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setToken: (token: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (username, password) => {
    const res = await authApi.login(username, password)
    const { access_token } = res.data
    // Simpan token dulu ke localStorage DAN axios header sebelum getMe()
    localStorage.setItem('token', access_token)
    client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    // Baru ambil user info
    const meRes = await authApi.getMe()
    set({ token: access_token, user: meRes.data, isAuthenticated: true })
  },

  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      localStorage.removeItem('token')
      delete client.defaults.headers.common['Authorization']
      set({ token: null, user: null, isAuthenticated: false })
    }
  },

  setToken: (token) => {
    localStorage.setItem('token', token)
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    set({ token, isAuthenticated: true })
  },
}))

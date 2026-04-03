import { create } from 'zustand'
import type { User } from '../types'
import * as authApi from '../api/auth'

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
    localStorage.setItem('token', access_token)
    const meRes = await authApi.getMe()
    set({ token: access_token, user: meRes.data, isAuthenticated: true })
  },

  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      localStorage.removeItem('token')
      set({ token: null, user: null, isAuthenticated: false })
    }
  },

  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token, isAuthenticated: true })
  },
}))

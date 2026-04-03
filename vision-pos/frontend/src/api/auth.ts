import client from './client'
import type { User } from '../types'

export interface LoginResponse {
  access_token: string
  token_type: string
  role: string
}

export const login = (username: string, password: string) =>
  client.post<LoginResponse>('/auth/login', { username, password })

export const logout = () =>
  client.post('/auth/logout')

export const getMe = () =>
  client.get<User>('/auth/me')

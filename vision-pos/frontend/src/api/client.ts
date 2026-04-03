import axios from 'axios'
import { useToastStore } from '../store/toastStore'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach JWT token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 + global error toast
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    } else {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Terjadi kesalahan. Silakan coba lagi.'
      useToastStore.getState().addToast(message, 'error')
    }
    return Promise.reject(error)
  }
)

export default client

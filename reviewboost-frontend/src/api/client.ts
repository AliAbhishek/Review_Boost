import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// Owner-authenticated client — attaches JWT on every request
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const hadToken = !!useAuthStore.getState().token
    if (hadToken && error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default client

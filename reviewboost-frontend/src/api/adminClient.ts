import axios from 'axios'
import { useAdminStore } from '@/store/adminStore'

const adminClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
})

adminClient.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

adminClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const hadToken = !!useAdminStore.getState().token
    if (hadToken && error.response?.status === 401) {
      useAdminStore.getState().logout()
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  },
)

export default adminClient

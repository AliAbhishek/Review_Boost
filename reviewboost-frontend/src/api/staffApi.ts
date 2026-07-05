import axios from 'axios'

const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

type Wrapped<T> = { status: string; data: T }

const STAFF_TOKEN_KEY = 'rb_staff_token'

export function getStaffToken(): string | null {
  return sessionStorage.getItem(STAFF_TOKEN_KEY)
}
export function setStaffToken(token: string): void {
  sessionStorage.setItem(STAFF_TOKEN_KEY, token)
}
export function clearStaffToken(): void {
  sessionStorage.removeItem(STAFF_TOKEN_KEY)
}

export const staffClient = axios.create({
  baseURL: base,
  headers: { 'Content-Type': 'application/json' },
})

staffClient.interceptors.request.use((config) => {
  const token = getStaffToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface StaffRestaurant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  logoColor: string
}

export const staffApi = {
  login: (slug: string, pin: string, staffName: string) =>
    axios
      .post<Wrapped<{ token: string; restaurant: StaffRestaurant }>>(`${base}/api/auth/staff-login`, { slug, pin, staffName })
      .then((r) => r.data.data),
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Admin {
  _id: string
  email: string
  name: string
}

interface AdminState {
  token: string | null
  admin: Admin | null
  isAuthenticated: boolean
  login: (token: string, admin: Admin) => void
  logout: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isAuthenticated: false,
      login: (token, admin) => set({ token, admin, isAuthenticated: true }),
      logout: () => set({ token: null, admin: null, isAuthenticated: false }),
    }),
    { name: 'reviewboost-admin' },
  ),
)

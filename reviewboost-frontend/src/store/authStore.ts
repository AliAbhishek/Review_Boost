import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Owner } from '@/types/owner'

interface AuthState {
  token: string | null
  owner: Owner | null
  isAuthenticated: boolean
  login: (token: string, owner: Owner) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      owner: null,
      isAuthenticated: false,
      login: (token, owner) => set({ token, owner, isAuthenticated: true }),
      logout: () => set({ token: null, owner: null, isAuthenticated: false }),
    }),
    {
      name: 'reviewboost-auth',
    },
  ),
)

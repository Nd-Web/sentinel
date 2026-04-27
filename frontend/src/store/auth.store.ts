import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/features/auth/types'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
}

interface AuthActions {
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'sentinel-auth' },
  ),
)

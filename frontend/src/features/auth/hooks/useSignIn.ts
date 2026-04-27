import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import type { SignInPayload } from '../types'

export function useSignIn() {
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (payload: SignInPayload) => authService.signIn(payload),
    onSuccess: ({ user, token }) => setAuth(user, token),
  })
}

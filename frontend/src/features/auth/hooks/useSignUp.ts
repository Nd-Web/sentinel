import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import type { SignUpPayload } from '../types'

export function useSignUp() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: SignUpPayload) => authService.signUp(payload),
    onSuccess: ({ user, token }) => {
      setAuth(user, token)
      navigate('/onboarding')
    },
  })
}
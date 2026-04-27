// TODO: Replace mock implementations with real http calls when backend is ready
// import { http } from '@/lib/http'
import type { AuthResponse, SignInPayload, SignUpPayload } from '@/features/auth/types'
import { MOCK_CREDENTIALS } from '@/features/auth/constants'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const authService = {
  async signIn(payload: SignInPayload): Promise<AuthResponse> {
    // return http.post<AuthResponse>('/auth/sign-in', payload).then(r => r.data)
    await delay(900)

    if (
      payload.email === MOCK_CREDENTIALS.email &&
      payload.password === MOCK_CREDENTIALS.password
    ) {
      return {
        user: {
          id: 'usr_demo_001',
          email: payload.email,
          firstName: 'Demo',
          lastName: 'Admin',
          role: 'admin',
          organization: 'Sentinel Demo Org',
        },
        token: 'mock.jwt.token.demo',
      }
    }

    throw new Error('Invalid email or password')
  },

  async signUp(payload: SignUpPayload): Promise<AuthResponse> {
    // return http.post<AuthResponse>('/auth/sign-up', payload).then(r => r.data)
    await delay(1100)

    return {
      user: {
        id: `usr_${crypto.randomUUID().slice(0, 8)}`,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: 'admin',
        organization: payload.organizationName,
      },
      token: `mock.jwt.token.${Math.random().toString(36).slice(2)}`,
    }
  },
}

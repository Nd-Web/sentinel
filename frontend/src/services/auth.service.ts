import { http } from '@/lib/http'
import type {
  AuthResponse,
  AuthUser,
  BackendAuthResponse,
  BackendUser,
  SignInPayload,
  SignUpPayload,
} from '@/features/auth/types'

export interface ApiKeyResponse {
  message: string
  api_key: string
  warning: string
}

function splitFullName(full: string | null | undefined): { firstName: string; lastName: string } {
  if (!full) return { firstName: '', lastName: '' }
  const trimmed = full.trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function mapBackendUser(user: BackendUser): AuthUser {
  const { firstName, lastName } = splitFullName(user.full_name)
  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    full_name: user.full_name,
    role: user.role,
    organization: user.organisation ?? '',
    organisation: user.organisation,
    is_active: user.is_active,
  }
}

function mapBackendAuth(payload: BackendAuthResponse): AuthResponse {
  return {
    user: mapBackendUser(payload.user),
    token: payload.access_token,
  }
}

export const authService = {
  async signIn(payload: SignInPayload): Promise<AuthResponse> {
    const { data } = await http.post<BackendAuthResponse>('/api/auth/login', {
      email: payload.email,
      password: payload.password,
    })
    return mapBackendAuth(data)
  },

  async signUp(payload: SignUpPayload): Promise<AuthResponse> {
    const { data } = await http.post<BackendAuthResponse>('/api/auth/register', {
      email: payload.email,
      password: payload.password,
      full_name: `${payload.firstName} ${payload.lastName}`.trim(),
      organisation: payload.organizationName,
    })
    return mapBackendAuth(data)
  },

  async getCurrentUser(): Promise<AuthUser> {
    const { data } = await http.get<BackendUser>('/api/auth/me')
    return mapBackendUser(data)
  },

  async generateApiKey(): Promise<ApiKeyResponse> {
    const { data } = await http.post<ApiKeyResponse>('/api/auth/generate-key')
    return data
  },
}

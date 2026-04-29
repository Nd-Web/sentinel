export type UserRole = 'admin' | 'analyst' | 'viewer'

/**
 * Frontend AuthUser shape.
 * Backend returns full_name + organisation; we expose firstName/lastName/organization
 * for the UI but also keep the raw fields so we can send them back unchanged on profile updates.
 */
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  full_name: string | null
  role: UserRole
  organization: string
  organisation: string | null
  is_active: boolean
  avatarUrl?: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface SignInPayload {
  email: string
  password: string
  rememberMe: boolean
}

export interface SignUpPayload {
  organizationName: string
  firstName: string
  lastName: string
  email: string
  password: string
}

// --- Raw backend shapes ---

export interface BackendUser {
  id: string
  email: string
  full_name: string | null
  organisation: string | null
  role: UserRole
  is_active: boolean
  last_login?: string | null
  created_at?: string
}

export interface BackendAuthResponse {
  access_token: string
  token_type: string
  user: BackendUser
}

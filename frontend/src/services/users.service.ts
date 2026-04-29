import { http } from '@/lib/http'
import type { UserRole } from '@/features/auth/types'

export interface BackendUserSummary {
  id: string
  email: string
  full_name: string | null
  organisation: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  last_login: string | null
}

// Alias for sentinel-main hooks
export type ApiUser = BackendUserSummary

export interface UserListResponse {
  users: BackendUserSummary[]
  total: number
}

export interface UsersListResponse extends UserListResponse {}

export interface InviteUserPayload {
  email: string
  full_name?: string
  organisation?: string
  role?: UserRole
}

export interface InviteUserResponse {
  message: string
  user: BackendUserSummary
  temporary_credentials: {
    email: string
    temporary_password: string
    warning: string
  }
}

export interface UpdateProfilePayload {
  full_name?: string
  organisation?: string
}

export interface ApiKeyResponse {
  message: string
  api_key: string
  warning: string
}

export const usersService = {
  // List all users
  async list(page = 1, pageSize = 50): Promise<UserListResponse> {
    const { data } = await http.get<UserListResponse>('/api/users', {
      params: { page, page_size: pageSize },
    })
    return data
  },

  // Alias for sentinel-main hooks (useUsers)
  async listUsers(params?: { page?: number; page_size?: number }): Promise<UserListResponse> {
    return usersService.list(params?.page ?? 1, params?.page_size ?? 50)
  },

  async invite(payload: InviteUserPayload): Promise<InviteUserResponse> {
    const { data } = await http.post<InviteUserResponse>('/api/users/invite', payload)
    return data
  },

  // Alias for sentinel-main hooks (useInviteUser)
  async inviteUser(payload: InviteUserPayload): Promise<InviteUserResponse> {
    return usersService.invite(payload)
  },

  async changeRole(userId: string, newRole: UserRole): Promise<BackendUserSummary> {
    const { data } = await http.put<BackendUserSummary>(
      `/api/users/${userId}/role`,
      null,
      { params: { new_role: newRole } },
    )
    return data
  },

  async deactivate(userId: string): Promise<BackendUserSummary> {
    const { data } = await http.put<BackendUserSummary>(`/api/users/${userId}/deactivate`)
    return data
  },

  async activate(userId: string): Promise<BackendUserSummary> {
    const { data } = await http.put<BackendUserSummary>(`/api/users/${userId}/activate`)
    return data
  },

  async deleteUser(userId: string): Promise<{ message: string }> {
    const { data } = await http.delete<{ message: string }>(`/api/users/${userId}`)
    return data
  },

  // Get own profile
  async getMe(): Promise<BackendUserSummary> {
    const { data } = await http.get<BackendUserSummary>('/api/users/me')
    return data
  },

  // Alias for sentinel-main hooks (useProfile)
  async getProfile(): Promise<BackendUserSummary> {
    return usersService.getMe()
  },

  async updateMe(payload: UpdateProfilePayload): Promise<BackendUserSummary> {
    const { data } = await http.put<BackendUserSummary>('/api/users/me', payload)
    return data
  },

  // Alias for sentinel-main hooks (useUpdateProfile)
  async updateProfile(payload: UpdateProfilePayload): Promise<BackendUserSummary> {
    return usersService.updateMe(payload)
  },

  async regenerateApiKey(): Promise<ApiKeyResponse> {
    const { data } = await http.post<ApiKeyResponse>('/api/auth/generate-key')
    return data
  },
}

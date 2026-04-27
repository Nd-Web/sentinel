export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  message: string
  success: boolean
  total: number
  page: number
  limit: number
}

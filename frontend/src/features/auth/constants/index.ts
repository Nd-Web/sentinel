export const AUTH_ROUTES = {
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  DASHBOARD: '/dashboard',
} as const

export const PASSWORD_MIN_LENGTH = 8

export const MOCK_CREDENTIALS = {
  email: 'demo@sentinel.ai',
  password: 'password',
} as const

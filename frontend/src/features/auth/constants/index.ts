export const AUTH_ROUTES = {
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  DASHBOARD: '/dashboard',
} as const

export const PASSWORD_MIN_LENGTH = 8

// Real default admin created on backend startup (see backend/main.py lifespan).
export const MOCK_CREDENTIALS = {
  email: 'admin@sentinelai.io',
  password: 'SentinelAdmin2026!',
} as const

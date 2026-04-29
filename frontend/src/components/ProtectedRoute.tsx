import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { UserRole } from '@/features/auth/types'

interface ProtectedRouteProps {
  /** Optional list of roles that may access this route. If unset, any authed user passes. */
  allowedRoles?: UserRole[]
  /** Where to redirect non-authed users. Defaults to /sign-in. */
  redirectTo?: string
}

export default function ProtectedRoute({
  allowedRoles,
  redirectTo = '/sign-in',
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Authed but wrong role — send them to the dashboard root.
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

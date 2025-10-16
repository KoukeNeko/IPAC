import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/components/providers/auth-provider'

export function ProtectedRoute() {
  const { token } = useAuth()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

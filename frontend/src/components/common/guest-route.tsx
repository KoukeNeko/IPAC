import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/components/providers/auth-provider'

export function GuestRoute() {
  const { token } = useAuth()

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

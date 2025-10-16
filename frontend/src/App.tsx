import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { AuthLayout } from '@/components/layout/auth-layout'
import { GuestRoute } from '@/components/common/guest-route'
import { ProtectedRoute } from '@/components/common/protected-route'
import DashboardPage from '@/pages/Dashboard'
import HostsPage from '@/pages/Hosts'
import LoginPage from '@/pages/Login'
import ReportsPage from '@/pages/Reports'
import SubnetsPage from '@/pages/Subnets'

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subnets" element={<SubnetsPage />} />
          <Route path="/hosts" element={<HostsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export default App

import * as React from 'react'
import { Toaster } from 'sonner'

import { ThemeProvider } from './theme-provider'
import { QueryProvider } from './query-provider'
import { AuthProvider } from './auth-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}

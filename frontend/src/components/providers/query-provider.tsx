import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

let queryClient: QueryClient | null = null

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const client = React.useMemo(() => queryClient ?? new QueryClient(), [])

  React.useEffect(() => {
    if (!queryClient) {
      queryClient = client
    }
  }, [client])

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

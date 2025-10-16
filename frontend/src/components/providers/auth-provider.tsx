import * as React from 'react'

interface AuthState {
  user: { email: string } | null
  token: string | null
}

interface AuthContextValue extends AuthState {
  login: (payload: { email: string; token: string }) => Promise<void>
  logout: () => void
  isAuthenticating: boolean
}

const storageKey = 'ipac-session'

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

const initialState: AuthState = {
  user: null,
  token: null,
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ token, user }, setAuthState] = React.useState<AuthState>(() => {
    if (typeof window === 'undefined') return initialState
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return initialState
      const parsed = JSON.parse(raw) as AuthState
      return parsed
    } catch (error) {
      console.warn('Failed to parse stored session', error)
      return initialState
    }
  })
  const [isAuthenticating, setIsAuthenticating] = React.useState(false)

  const login = React.useCallback(({ email, token }: { email: string; token: string }) => {
    setIsAuthenticating(true)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const state: AuthState = { user: { email }, token }
        setAuthState(state)
        window.localStorage.setItem(storageKey, JSON.stringify(state))
        setIsAuthenticating(false)
        resolve()
      }, 500)
    })
  }, [])

  const logout = React.useCallback(() => {
    setAuthState(initialState)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, token, login, logout, isAuthenticating }),
    [user, token, login, logout, isAuthenticating]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth 必須在 AuthProvider 內使用')
  }
  return context
}

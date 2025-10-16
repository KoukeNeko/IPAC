import * as React from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = React.createContext<{
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
} | null>(null)

const storageKey = 'ipac-theme-preference'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(storageKey) as Theme | null
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => getInitialTheme())

  const applyTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, next)
    }
  }, [])

  const setTheme = React.useCallback((next: Theme) => {
    applyTheme(next)
  }, [applyTheme])

  const toggleTheme = React.useCallback(() => {
    applyTheme(theme === 'light' ? 'dark' : 'light')
  }, [applyTheme, theme])

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  const value = React.useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)

  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return ctx
}

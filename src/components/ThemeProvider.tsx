import { createContext, type ReactNode, useContext, useEffect } from 'react'

interface ThemeContextType {
  theme: 'dark'
  resolvedTheme: 'dark'
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light')
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

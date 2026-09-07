import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState(null)

  // Restore authentication state from localStorage
  const restoreSession = useCallback(() => {
    try {
      const storedToken = localStorage.getItem('authToken')
      const storedUser = localStorage.getItem('user')

      if (storedToken) {
        setToken(storedToken)
        setIsAuthenticated(true)

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser))
          } catch (error) {
            console.error('Failed to parse stored user:', error)
            setUser(null)
          }
        }

        return
      }

      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Failed to restore session:', error)

      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
    }
  }, [])

  // Restore session on mount
  useEffect(() => {
    restoreSession()
    setIsLoading(false)
  }, [restoreSession])

  // Keep auth state synchronized with localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      restoreSession()
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [restoreSession])

  const login = useCallback((userData, authToken, refreshToken = null) => {
    if (!authToken) {
      console.error('Login attempted without access token')
      return
    }

    setUser(userData)
    setToken(authToken)
    setIsAuthenticated(true)
    setError(null)

    localStorage.setItem('authToken', authToken)

    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }

    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    setError(null)

    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
  }, [])

  const setAuthError = useCallback((err) => {
    setError(err)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    setAuthError,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
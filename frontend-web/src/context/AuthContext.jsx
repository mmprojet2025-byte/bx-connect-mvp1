import { createContext, useContext, useState, useEffect } from 'react'
import { trackLoginSuccessRole } from '../monitoring/analytics'
import { restoreSession } from './restoreSession'
import { onUnauthorized } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isRestoringSession, setIsRestoringSession] = useState(true)

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    const session = restoreSession(localStorage)
    setToken(session.token)
    setUser(session.user)
    setIsRestoringSession(false)
  }, [])

  useEffect(() => onUnauthorized(() => {
    setToken(null)
    setUser(null)
  }), [])

  // login : appelé après /api/auth/login ou après mise à jour du profil
  const login = (newToken, userData) => {
    setToken(newToken)
    setUser(userData)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    trackLoginSuccessRole(userData?.role)
  }

  // logout : vide tout
  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const isAuthenticated = !!token && !!user
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isAdmin      = user?.role === 'ADMIN'
  const isReferent   = user?.role === 'REFERENT'
  const isMembre     = user?.role === 'MEMBRE'
  const isPartenaire = user?.role === 'PARTENAIRE'

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated,
      isRestoringSession,
      isAdmin,
      isSuperAdmin,
      isReferent,
      isMembre,
      isPartenaire,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}

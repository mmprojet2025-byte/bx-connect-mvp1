import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDefaultRouteForRole } from './roleRoutes'

export default function SuperAdminRoute({ children }) {
  const { isAuthenticated, isSuperAdmin, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperAdmin) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />

  return children
}

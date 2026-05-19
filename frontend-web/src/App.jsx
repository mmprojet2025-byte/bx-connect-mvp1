import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Accueil from './pages/Accueil'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/dashboard/Dashboard'
import Activites from './pages/activites/Activites'
import Projets from './pages/projets/Projets'
import Groupes from './pages/groupes/Groupes'
import Messagerie from './pages/messagerie/Messagerie'
import Profil from './pages/profil/Profil'
import AdminDashboard from './pages/admin/AdminDashboard'

// Route protégée : redirige vers /login si non connecté
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Route admin : redirige vers /dashboard si pas admin
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Pages publiques */}
      <Route path="/" element={<Accueil />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/activites" element={<Activites />} />
      <Route path="/projets" element={<Projets />} />
      
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profil" element={<PrivateRoute><Profil /></PrivateRoute>} />

      {/* Pages admin */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
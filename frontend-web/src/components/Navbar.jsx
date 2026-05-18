import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { isAuthenticated, isAdmin, isReferent, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-blue-900 text-white px-4 py-3 shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold tracking-tight hover:text-blue-200 transition">
          BX-CONNECT
        </Link>

        {/* Liens principaux */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-blue-200 transition">Accueil</Link>
          <Link to="/activites" className="hover:text-blue-200 transition">Activités</Link>
          <Link to="/projets" className="hover:text-blue-200 transition">Projets</Link>
          <Link to="/groupes" className="hover:text-blue-200 transition">Groupes</Link>
          {isAuthenticated && (
            <Link to="/dashboard" className="hover:text-blue-200 transition">Tableau de bord</Link>
          )}
          {(isAdmin || isReferent) && (
            <Link to="/admin" className="hover:text-blue-200 transition text-yellow-300">
              ⚙️ Admin
            </Link>
          )}
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-3 text-sm">
          {isAuthenticated ? (
            <>
              <Link
                to="/profil"
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded-full transition"
              >
                <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </span>
                <span className="hidden md:inline">{user?.prenom}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-full transition font-medium"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hover:text-blue-200 transition font-medium"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="bg-white text-blue-900 hover:bg-blue-100 px-4 py-1.5 rounded-full transition font-semibold"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
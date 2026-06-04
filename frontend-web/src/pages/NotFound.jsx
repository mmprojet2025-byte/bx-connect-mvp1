import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppIcon from '../components/ui/AppIcons'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Illustration */}
          <AppIcon name="Search" className="mx-auto mb-6 h-20 w-20 text-blue-200" />

          {/* Code erreur */}
          <h1 className="text-6xl font-bold text-blue-800 mb-2">404</h1>

          {/* Message */}
          <h2 className="text-xl font-semibold text-gray-700 mb-3">
            Page introuvable
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-full transition"
            >
              <AppIcon name="Home" className="h-4 w-4" />
              Retour à l'accueil
            </Link>
            <Link
              to="/activites"
              className="inline-flex items-center justify-center gap-2 border border-blue-700 text-blue-700 hover:bg-blue-50 font-semibold px-6 py-2.5 rounded-full transition"
            >
              <AppIcon name="Folder" className="h-4 w-4" />
              Voir les activités
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

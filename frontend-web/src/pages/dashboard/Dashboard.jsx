import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

export default function Dashboard() {
  const { user, isAdmin, isReferent } = useAuth()
  const { t } = useTranslation()
  const [inscriptions, setInscriptions] = useState([])
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/inscriptions/mes-inscriptions').catch(() => ({ data: [] })),
      api.get('/projets/mes-projets').catch(() => ({ data: [] }))
    ]).then(([ins, proj]) => {
      setInscriptions(ins.data)
      setProjets(proj.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        {/* Bienvenue */}
        <div className="bg-blue-800 text-white rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {t('dashboard.welcome')}, {user?.prenom} 👋
            </h1>
            <p className="text-blue-200 mt-1 text-sm">
              {t('dashboard.role')} : <span className="font-semibold uppercase">{user?.role}</span>
            </p>
          </div>
          <Link
            to="/profil"
            className="bg-white text-blue-800 text-sm font-semibold px-4 py-2 rounded-full hover:bg-blue-100 transition"
          >
            {t('nav.profile')}
          </Link>
        </div>

        {/* Raccourcis */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <ShortcutCard to="/activites"  icon="🎯" label={t('nav.activities')} />
          <ShortcutCard to="/projets"    icon="🚀" label={t('nav.projects')} />
          <ShortcutCard to="/groupes"    icon="👥" label={t('nav.groups')} />
          <ShortcutCard to="/messagerie" icon="💬" label={t('nav.messaging')} />
          <ShortcutCard to="/profil"     icon="👤" label={t('nav.profile')} />
          {(isAdmin || isReferent) && (
            <ShortcutCard to="/admin" icon="⚙️" label={t('nav.admin')} highlight />
          )}
        </div>

        {/* Contenu principal */}
        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Mes inscriptions */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{t('dashboard.my_activities')}</h2>
              {inscriptions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-3">{t('dashboard.no_activities')}</p>
                  <Link to="/activites" className="text-blue-700 text-sm font-medium hover:underline">
                    {t('dashboard.see_activities')} →
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {inscriptions.slice(0, 4).map(ins => (
                    <li key={ins.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{ins.activiteTitre || 'Activité'}</p>
                        <p className="text-xs text-gray-400">{ins.statut}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Inscrit
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mes projets */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{t('dashboard.my_projects')}</h2>
              {projets.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-3">{t('dashboard.no_projects')}</p>
                  <Link to="/projets" className="text-blue-700 text-sm font-medium hover:underline">
                    {t('dashboard.see_projects')} →
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {projets.slice(0, 4).map(p => (
                    <li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{p.titre}</p>
                        <p className="text-xs text-gray-400">{p.statut}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {p.statut}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function ShortcutCard({ to, icon, label, highlight }) {
  return (
    <Link
      to={to}
      className={`rounded-2xl shadow p-4 text-center hover:shadow-md transition ${highlight ? 'bg-yellow-50 border border-yellow-200' : 'bg-white'}`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <p className={`text-xs font-medium ${highlight ? 'text-yellow-700' : 'text-gray-700'}`}>{label}</p>
    </Link>
  )
}
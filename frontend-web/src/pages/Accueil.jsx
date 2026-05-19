import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'

export default function Accueil() {
  const [activites, setActivites] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    api.get('/activites')
      .then(res => setActivites(res.data.slice(0, 3)))
      .catch(() => setActivites([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-blue-800 text-white py-20 px-4 text-center">
        <h1 className="text-4xl font-bold mb-4">{t('home.welcome')}</h1>
        <p className="text-lg text-blue-200 max-w-xl mx-auto mb-8">
          {t('home.subtitle')}
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/register"
            className="bg-white text-blue-800 font-semibold px-6 py-2 rounded-full hover:bg-blue-100 transition"
          >
            {t('home.cta_join')}
          </Link>
          <Link
            to="/activites"
            className="border border-white text-white px-6 py-2 rounded-full hover:bg-blue-700 transition"
          >
            {t('home.cta_activities')}
          </Link>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="py-14 px-4 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-10">
          {t('home.features_title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold text-lg text-blue-800 mb-2">{t('home.feature_activities_title')}</h3>
            <p className="text-gray-500 text-sm">{t('home.feature_activities_desc')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="font-semibold text-lg text-blue-800 mb-2">{t('home.feature_projects_title')}</h3>
            <p className="text-gray-500 text-sm">{t('home.feature_projects_desc')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="font-semibold text-lg text-blue-800 mb-2">{t('home.feature_community_title')}</h3>
            <p className="text-gray-500 text-sm">{t('home.feature_community_desc')}</p>
          </div>
        </div>
      </section>

      {/* Activités récentes */}
      <section className="py-10 px-4 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{t('home.recent_activities')}</h2>
          <Link to="/activites" className="text-blue-700 text-sm font-medium hover:underline">
            {t('home.see_all')}
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center">{t('common.loading')}</p>
        ) : activites.length === 0 ? (
          <p className="text-gray-400 text-center">{t('home.no_activities')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activites.map(a => (
              <div key={a.id} className="bg-white rounded-2xl shadow p-5">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {a.categorie || 'Général'}
                </span>
                <h3 className="font-semibold text-gray-800 mt-3 mb-1">{a.titre}</h3>
                <p className="text-gray-500 text-sm mb-3 line-clamp-2">{a.description}</p>
                <div className="text-xs text-gray-400">
                  📍 {a.lieu || 'Bruxelles'} · {a.gratuite ? `🆓 ${t('activities.free')}` : `💶 ${a.prix} €`}
                </div>
                <Link
                  to="/activites"
                  className="mt-3 block text-center bg-blue-700 hover:bg-blue-600 text-white text-sm py-1.5 rounded-lg transition"
                >
                  {t('home.see_all').replace(' →', '')}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex-1" />
      <Footer />
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'
import AppIcon from '../components/ui/AppIcons'
import homeImage from '../assets/images/home.png'

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
      <section
        className="relative isolate overflow-hidden bg-blue-800 bg-cover bg-center px-4 py-16 text-center text-white sm:py-20"
        style={{ backgroundImage: `url(${homeImage})` }}
      >
        <div className="absolute inset-0 -z-10 bg-blue-950/70" aria-hidden="true" />
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{t('home.welcome')}</h1>
          <p className="mx-auto mb-8 max-w-xl text-base text-blue-100 sm:text-lg">
            {t('home.subtitle')}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="w-full max-w-xs rounded-full bg-white px-6 py-2 font-semibold text-blue-800 transition hover:bg-blue-100 sm:w-auto"
            >
              {t('home.cta_join')}
            </Link>
            <Link
              to="/activites"
              className="w-full max-w-xs rounded-full border border-white px-6 py-2 text-white transition hover:bg-blue-700 sm:w-auto"
            >
              {t('home.cta_activities')}
            </Link>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="py-14 px-4 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-10">
          {t('home.features_title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <AppIcon name="Folder" className="mx-auto mb-3 h-10 w-10 text-blue-700" />
            <h3 className="font-semibold text-lg text-blue-800 mb-2">{t('home.feature_activities_title')}</h3>
            <p className="text-gray-500 text-sm">{t('home.feature_activities_desc')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <AppIcon name="Rocket" className="mx-auto mb-3 h-10 w-10 text-blue-700" />
            <h3 className="font-semibold text-lg text-blue-800 mb-2">{t('home.feature_projects_title')}</h3>
            <p className="text-gray-500 text-sm">{t('home.feature_projects_desc')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <AppIcon name="Handshake" className="mx-auto mb-3 h-10 w-10 text-blue-700" />
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1"><AppIcon name="MapPin" className="h-3.5 w-3.5" />{a.lieu || 'Bruxelles'}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><AppIcon name={a.gratuite ? 'CheckCircle' : 'Wallet'} className="h-3.5 w-3.5" />{a.gratuite ? t('activities.free') : `${a.prix} €`}</span>
                </div>
                <Link
                  to="/activites"
                  className="mt-3 block text-center bg-blue-700 hover:bg-blue-600 text-white text-sm py-1.5 rounded-lg transition"
                >
                  {t('home.see_all').replace(/\s*\u2192\s*$/, '')}
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

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

export default function ReferentProjets() {
  const { t, i18n } = useTranslation()
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProjets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/projets/referent/mes-groupes')
      setProjets(Array.isArray(res.data) ? res.data : [])
      setError('')
    } catch {
      setError(t('referent.errorProjectsLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchProjets() }, [fetchProjets])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-900">{t('referent.projectsTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('referent.projectsSubtitle')}</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : projets.length === 0 ? (
          <EmptyState>{t('referent.noProjects')}</EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {projets.map(projet => (
              <article key={projet.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-blue-900">{projet.titre}</h2>
                    {projet.groupeNom && (
                      <p className="text-xs text-gray-400 mt-1">{t('referent.projectGroup', { group: projet.groupeNom })}</p>
                    )}
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 h-fit">
                    {t(`statuses.${projet.statut}`, projet.statut)}
                  </span>
                </div>

                {projet.description && <p className="text-sm text-gray-500 mt-3">{projet.description}</p>}

                <dl className="text-xs text-gray-500 mt-4 grid gap-1">
                  <InfoLine label={t('referent.projectOwner')} value={formatOwner(projet, t)} />
                  <InfoLine label={t('referent.projectDate')} value={formatDate(projet.dateSoumission || projet.dateCreation, i18n.language)} />
                  {projet.budgetDemande != null && (
                    <InfoLine label={t('projects.form_budget')} value={`${projet.budgetDemande} €`} />
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function InfoLine({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-semibold text-gray-700">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function EmptyState({ children }) {
  return <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 text-sm">{children}</div>
}

function formatOwner(projet, t) {
  const owner = [projet.porteurPrenom, projet.porteurNom].filter(Boolean).join(' ')
  return owner || t('referent.projectOwnerUnknown')
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}

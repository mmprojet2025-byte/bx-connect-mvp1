import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import GroupAvatar from '../../components/GroupAvatar'
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError'
import PageHeader from '../../components/ui/PageHeader'

export default function Groupes() {
  const { isAuthenticated, isMembre } = useAuth()
  const { t } = useTranslation()

  const [groupes, setGroupes] = useState([])
  const [adhesions, setAdhesions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [recherche, setRecherche] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchGroupes()
  }, [])

  useEffect(() => {
    if (isAuthenticated && isMembre) fetchAdhesions()
  }, [isAuthenticated, isMembre])

  const fetchGroupes = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/groupes')
      setGroupes(res.data)
    } catch {
      setError(t('groups.error_load'))
    } finally {
      setLoading(false)
    }
  }

  const fetchAdhesions = async () => {
    try {
      const res = await api.get('/groupes/mes-adhesions')
      setAdhesions(res.data)
    } catch {
      setAdhesions([])
    }
  }

  const handleRejoindre = async (groupeId) => {
    setMessage('')
    setError('')
    setActionLoading(groupeId)
    try {
      await api.post(`/groupes/${groupeId}/rejoindre`)
      setMessage(t('ux.groups.requestSent'))
      await Promise.all([fetchGroupes(), fetchAdhesions()])
    } catch (err) {
      setError(userFriendlyError(err, t('groups.error_load')))
    } finally {
      setActionLoading(null)
    }
  }

  const handleQuitter = async (groupeId) => {
    if (!confirmSensitiveAction('Quitter ce groupe ? Vous perdrez l’accès à sa messagerie.')) return
    setMessage('')
    setError('')
    setActionLoading(groupeId)
    try {
      await api.delete(`/groupes/${groupeId}/quitter`)
      setMessage(t('groups.success_leave'))
      await Promise.all([fetchGroupes(), fetchAdhesions()])
    } catch (err) {
      setError(userFriendlyError(err, t('groups.error_load')))
    } finally {
      setActionLoading(null)
    }
  }

  const adhesionParGroupe = useMemo(() => {
    return adhesions.reduce((acc, adhesion) => {
      acc[adhesion.groupeId] = adhesion
      return acc
    }, {})
  }, [adhesions])

  const adhesionActive = adhesions.find((adhesion) => adhesion.statut === 'ACCEPTE')
  const adhesionEnAttente = adhesions.find((adhesion) => adhesion.statut === 'EN_ATTENTE')
  const bloqueNouvelleDemande = !!adhesionActive || !!adhesionEnAttente

  const groupesFiltres = groupes.filter((groupe) =>
    groupe.nom?.toLowerCase().includes(recherche.toLowerCase())
  )

  const intro = isAuthenticated && isMembre
    ? t('ux.groups.memberIntro')
    : t('ux.groups.visitorIntro')

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('ux.groups.community')}
          title={t('groups.title')}
          description={intro}
        />

        {isAuthenticated && isMembre && (
          <MemberGroupSummary adhesionActive={adhesionActive} adhesionEnAttente={adhesionEnAttente} />
        )}

        {message && <Alert type="success">{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-4 mb-6">
          <input
            type="text"
            placeholder={t('groups.search')}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {loading ? (
          <p className="text-slate-400 text-center py-10">{t('groups.loading')}</p>
        ) : groupesFiltres.length === 0 ? (
          <EmptyState
            title={t('ux.groups.noAvailableTitle')}
            description={t('ux.groups.noAvailableDescription')}
            actionLabel={t('activities.viewActivities')}
            actionTo="/activites"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groupesFiltres.map((groupe) => {
              const adhesion = adhesionParGroupe[groupe.id]
              return (
                <GroupCard
                  key={groupe.id}
                  groupe={groupe}
                  adhesion={adhesion}
                  isAuthenticated={isAuthenticated}
                  isMembre={isMembre}
                  bloqueNouvelleDemande={bloqueNouvelleDemande}
                  actionLoading={actionLoading === groupe.id}
                  onJoin={() => handleRejoindre(groupe.id)}
                  onLeave={() => handleQuitter(groupe.id)}
                />
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function MemberGroupSummary({ adhesionActive, adhesionEnAttente }) {
  const { t } = useTranslation()

  if (adhesionActive) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
        <p className="text-green-800 font-semibold text-sm">{t('groups.member_of', { group: adhesionActive.groupeNom })}</p>
        <p className="text-green-700 text-sm mt-1">{t('groups.messaging_available')}</p>
      </div>
    )
  }

  if (adhesionEnAttente) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-amber-900 font-semibold text-sm">{t('groups.request_pending_for', { group: adhesionEnAttente.groupeNom })}</p>
        <p className="text-amber-700 text-sm mt-1">{t('groups.messaging_after_acceptance')}</p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <p className="text-slate-950 font-semibold text-sm">{t('groups.no_group_joined')}</p>
      <p className="text-blue-600 text-sm mt-1">{t('groups.choose_group')}</p>
    </div>
  )
}

function GroupCard({ groupe, adhesion, isAuthenticated, isMembre, bloqueNouvelleDemande, actionLoading, onJoin, onLeave }) {
  const { t } = useTranslation()
  const isAccepted = adhesion?.statut === 'ACCEPTE'
  const isPending = adhesion?.statut === 'EN_ATTENTE'
  const referent = [groupe.referentPrenom, groupe.referentNom].filter(Boolean).join(' ')
  const placesLabel = groupe.capaciteMax > 0
    ? t('groups.members_capacity', { count: groupe.nombreMembres ?? 0, capacity: groupe.capaciteMax })
    : t('groups.members_count', { count: groupe.nombreMembres ?? 0 })

  return (
    <article className={`bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-5 flex flex-col gap-4 border hover:-translate-y-0.5 hover:shadow-lg transition ${isAccepted ? 'border-green-300' : 'border-transparent'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <GroupAvatar name={groupe.nom} />
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-950 text-lg leading-tight">{groupe.nom}</h2>
          {referent && <p className="text-xs text-slate-500 mt-1">{t('groups.referent_label', { referent })}</p>}
          </div>
        </div>
        {adhesion?.statut && <GroupStatusBadge statut={adhesion.statut} />}
      </div>

      <p className="text-slate-500 text-sm leading-relaxed min-h-[44px]">
        {groupe.description || t('groups.description_soon')}
      </p>

      <div className="grid grid-cols-1 gap-2 text-xs">
        <InfoPill value={placesLabel} />
        <div className="flex flex-wrap gap-2">
          {groupe.theme && <span className="bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full font-semibold">{groupe.theme}</span>}
          {groupe.categorie && <span className="bg-gray-100 text-slate-700 px-2.5 py-1 rounded-full font-semibold">{groupe.categorie}</span>}
        </div>
      </div>

      <div className="mt-auto">
        {!isAuthenticated ? (
          <Link
            to="/login"
            className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-xl transition"
          >
            {t('ux.groups.joinLogin')}
          </Link>
        ) : !isMembre ? null : isAccepted ? (
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/dashboard"
              className="text-center bg-green-700 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-xl transition"
            >
              {t('ux.groups.openMyGroup')}
            </Link>
            <button
              type="button"
              onClick={onLeave}
              disabled={actionLoading}
              className="border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold py-2 rounded-xl transition disabled:opacity-60"
            >
              {t('groups.leave_btn')}
            </button>
          </div>
        ) : isPending ? (
          <button
            type="button"
            disabled
            className="w-full bg-amber-100 text-amber-800 text-sm font-semibold py-2 rounded-xl"
          >
            {t('ux.groups.pending')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={bloqueNouvelleDemande || actionLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:text-slate-600 text-white text-sm font-semibold py-2 rounded-xl transition"
          >
            {bloqueNouvelleDemande ? t('ux.groups.oneGroupOnly') : actionLoading ? t('groups.sending') : t('ux.groups.joinGroup')}
          </button>
        )}
      </div>
    </article>
  )
}

function GroupStatusBadge({ statut }) {
  const { t } = useTranslation()
  return (
    <StatusBadge status={statut}>
      {t(`statuses.${statut}`, { defaultValue: statut })}
    </StatusBadge>
  )
}

function InfoPill({ value }) {
  return (
    <div className="rounded-xl bg-blue-50 px-3 py-2 font-semibold text-blue-800">
      {value}
    </div>
  )
}

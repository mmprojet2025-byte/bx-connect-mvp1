import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import GroupAvatar from '../../components/GroupAvatar'
import AppIcon from '../../components/ui/AppIcons'
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError'
import PageHeader from '../../components/ui/PageHeader'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'

export default function Groupes() {
  const { isAuthenticated, isMembre } = useAuth()
  const { t } = useTranslation()

  const [adhesions, setAdhesions] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [recherche, setRecherche] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const {
    data: groupes = [],
    isLoading: loading,
    isError: groupesEnErreur,
    refetch: refetchGroupes,
  } = useQuery({
    queryKey: ['groupes', 'public'],
    queryFn: async () => {
      const res = await api.get('/groupes')
      return res.data || []
    },
    retry: 1,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (isAuthenticated && isMembre) fetchAdhesions()
  }, [isAuthenticated, isMembre])

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
      const feedback = t('ux.groups.requestSent')
      setMessage(feedback)
      toast.success(feedback)
      await Promise.all([refetchGroupes(), fetchAdhesions()])
    } catch (err) {
      const feedback = userFriendlyError(err, t('groups.error_load'))
      setError(feedback)
      toast.error(feedback)
    } finally {
      setActionLoading(null)
    }
  }

  const handleQuitter = async (groupeId) => {
    if (!confirmSensitiveAction(t('groups.confirm_leave'))) return
    setMessage('')
    setError('')
    setActionLoading(groupeId)
    try {
      await api.delete(`/groupes/${groupeId}/quitter`)
      const feedback = t('groups.success_leave')
      setMessage(feedback)
      toast.success(feedback)
      await Promise.all([refetchGroupes(), fetchAdhesions()])
    } catch (err) {
      const feedback = userFriendlyError(err, t('groups.error_load'))
      setError(feedback)
      toast.error(feedback)
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
  const groupLife = useMemo(() => {
    const totalMembers = groupes.reduce((sum, groupe) => sum + Number(groupe.nombreMembres || 0), 0)
    const totalProjects = groupes.reduce((sum, groupe) => sum + Number(groupe.nombreProjets || groupe.projetsCount || 0), 0)
    const totalActivities = groupes.reduce((sum, groupe) => sum + Number(groupe.nombreActivites || groupe.activitesCount || 0), 0)
    const groupsWithReferent = groupes.filter(groupe => groupe.referentPrenom || groupe.referentNom).length
    return { totalMembers, totalProjects, totalActivities, groupsWithReferent }
  }, [groupes])

  const intro = isAuthenticated && isMembre
    ? t('ux.groups.memberIntro')
    : t('ux.groups.visitorIntro')

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <PageHeader
          eyebrow={t('ux.groups.community')}
          title={t('groups.title')}
          description={intro}
          action={(
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
              <AppIcon name="Users" className="mr-2 inline h-4 w-4" />
              {t('groups.publicCount', { count: groupes.length, defaultValue: `${groupes.length} groupe(s)` })}
            </div>
          )}
        />

        {isAuthenticated && isMembre && (
          <MemberGroupSummary adhesionActive={adhesionActive} adhesionEnAttente={adhesionEnAttente} />
        )}

        <GroupLifeSummary groupLife={groupLife} isAuthenticated={isAuthenticated} />

        {message && <Alert type="success">{message}</Alert>}
        {error && groupes.length > 0 && <Alert type="error">{error}</Alert>}

        <div className="bg-white rounded-[1.25rem] border border-slate-100 shadow-sm p-3 mb-5">
          <input
            type="text"
            placeholder={t('groups.search')}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : groupesEnErreur && groupes.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={t('groups.error_load') || t('common.loadErrorDescription')}
            actionLabel={t('common.retry')}
            action={refetchGroupes}
          />
        ) : groupesFiltres.length === 0 ? (
          <EmptyState
            icon="Users"
            title={t('ux.groups.noAvailableTitle')}
            description={t('ux.groups.noAvailableDescription')}
            actionLabel={t('activities.viewActivities')}
            actionTo="/activites"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

function GroupLifeSummary({ groupLife, isAuthenticated }) {
  const { t } = useTranslation()
  return (
    <section className="mb-5 grid gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t('groups.lifeMembers', { defaultValue: 'Membres visibles' })}</p>
        <p className="mt-1 text-xl font-black text-slate-950">{groupLife.totalMembers}</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t('nav.projects', { defaultValue: 'Projets' })}</p>
        <p className="mt-1 text-xl font-black text-slate-950">{groupLife.totalProjects}</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t('nav.activities', { defaultValue: 'Activités' })}</p>
        <p className="mt-1 text-xl font-black text-slate-950">{groupLife.totalActivities}</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t('groups.lifeReferents', { defaultValue: 'Groupes encadrés' })}</p>
        <p className="mt-1 text-xl font-black text-slate-950">{groupLife.groupsWithReferent}</p>
      </div>
      <Link to={isAuthenticated ? '/messagerie' : '/login'} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm transition hover:border-blue-300 md:col-span-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-blue-500">{t('nav.messaging')}</p>
        <p className="mt-1 text-sm font-black text-blue-900">{t('groups.lifeMessaging', { defaultValue: 'Échanger avec son groupe après adhésion' })}</p>
      </Link>
    </section>
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
    <article className={`bg-white rounded-[1.25rem] border border-slate-100 shadow-sm p-4 flex flex-col gap-3 border hover:-translate-y-0.5 hover:shadow-lg transition ${isAccepted ? 'border-green-300' : 'border-transparent'}`}>
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

      <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
        {groupe.description || t('groups.description_soon')}
      </p>

      <div className="grid grid-cols-1 gap-2 text-xs">
        <InfoPill value={placesLabel} />
        <div className="flex flex-wrap gap-2">
          {groupe.theme && <span className="bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full font-semibold">{groupe.theme}</span>}
          {groupe.categorie && <span className="bg-gray-100 text-slate-700 px-2.5 py-1 rounded-full font-semibold">{groupe.categorie}</span>}
        </div>
      </div>

      <WorkspacePreview
        groupeId={groupe.id}
        isAccepted={isAccepted}
        isAuthenticated={isAuthenticated}
      />

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
              to={`/groupes/${groupe.id}`}
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

function WorkspacePreview({ groupeId, isAccepted, isAuthenticated }) {
  const { t } = useTranslation()
  const items = [
    {
      icon: 'MessageCircle',
      label: t('nav.messaging'),
      to: isAccepted ? `/groupes/${groupeId}` : isAuthenticated ? `/groupes/${groupeId}` : '/login',
      available: isAccepted,
      note: isAccepted ? t('common.open') : t('groups.messaging_after_acceptance'),
    },
    {
      icon: 'Users',
      label: t('groups.members'),
      to: `/groupes/${groupeId}?tab=membres`,
      available: isAccepted,
      note: isAccepted ? t('common.open') : t('groups.joinRequired', { defaultValue: 'Après adhésion' }),
    },
    {
      icon: 'Calendar',
      label: t('nav.activities'),
      to: `/groupes/${groupeId}?tab=activites`,
      available: true,
      note: t('common.open'),
    },
    {
      icon: 'Rocket',
      label: t('nav.projects'),
      to: `/groupes/${groupeId}?tab=projets`,
      available: true,
      note: t('common.open'),
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
      <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
        {t('groups.workspace', { defaultValue: 'Espace collaboratif' })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => item.available || item.to ? (
          <Link
            key={item.label}
            to={item.to}
            className={`rounded-xl border px-2.5 py-2 transition ${
              item.available
                ? 'border-blue-100 bg-white hover:border-blue-300 hover:shadow-sm'
                : 'border-slate-100 bg-white text-slate-400'
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
              <AppIcon name={item.icon} className="h-3.5 w-3.5" />
              {item.label}
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{item.note}</span>
          </Link>
        ) : (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-white px-2.5 py-2 text-slate-400">
            <span className="flex items-center gap-1.5 text-xs font-black">
              <AppIcon name={item.icon} className="h-3.5 w-3.5" />
              {item.label}
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold">{item.note}</span>
          </div>
        ))}
      </div>
    </div>
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

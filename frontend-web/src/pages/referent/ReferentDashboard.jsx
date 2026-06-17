import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import AppIcon from '../../components/ui/AppIcons'
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard'
import ActivityFeed from '../../components/dashboard/ActivityFeed'

export default function ReferentDashboard() {
  const [stats, setStats] = useState({ groupes: 0, membres: 0, demandes: 0, activites: 0 })
  const [groupes, setGroupes] = useState([])
  const [detailsGroupes, setDetailsGroupes] = useState([])
  const [activites, setActivites] = useState([])
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [groupesRes, activitesRes, projetsRes] = await Promise.all([
        api.get('/referent/groupes'),
        api.get('/referent/mes-activites'),
        api.get('/projets/referent/mes-groupes').catch(() => ({ data: [] })),
      ])

      const groupesData = groupesRes.data
      const details = await Promise.all(groupesData.map(async (groupe) => {
        const [membresRes, demandesRes] = await Promise.all([
          api.get(`/referent/groupes/${groupe.id}/membres`),
          api.get(`/referent/groupes/${groupe.id}/demandes`),
        ])
        return { groupe, membres: membresRes.data, demandes: demandesRes.data }
      }))

      setGroupes(groupesData)
      setDetailsGroupes(details)
      setActivites(activitesRes.data)
      setProjets(Array.isArray(projetsRes.data) ? projetsRes.data : [])
      setStats({
        groupes: groupesData.length,
        membres: details.reduce((total, item) => total + item.membres.length, 0),
        demandes: details.reduce((total, item) => total + item.demandes.length, 0),
        activites: activitesRes.data.length,
      })
      setError('')
    } catch {
      setError(t('referent.dashboardError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const demandesRecentes = useMemo(
    () => detailsGroupes.flatMap(item => item.demandes.map(demande => ({ ...demande, groupeNom: item.groupe.nom }))).slice(0, 5),
    [detailsGroupes]
  )
  const membresRecents = useMemo(
    () => detailsGroupes.flatMap(item => item.membres.map(membre => ({ ...membre, groupeNom: item.groupe.nom }))).slice(0, 5),
    [detailsGroupes]
  )
  const prochainesActivites = activites.slice(0, 4)
  const activitesAPublier = activites.filter(activite => activite.statut === 'BROUILLON')
  const projetsASuivre = projets.filter(projet => ['SOUMIS', 'EN_COURS'].includes(projet.statut)).slice(0, 3)

  return (
    <CollaborativeDashboardLayout
      role="REFERENT"
      emoji="User"
      title={t('referent.hello', { name: user?.prenom || '', defaultValue: `Bonjour ${user?.prenom || ''} 👋` })}
      subtitle={t('referent.dashboardSummary', {
        groups: stats.groupes,
        requests: stats.demandes,
        defaultValue: `${stats.groupes} groupe(s) encadré(s) · ${stats.demandes} demande(s) à traiter`,
      })}
    >
        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-slate-400 text-center py-10">{t('common.loading')}</p>
        ) : (
          <>
            <ReferentWorkQueue
              demandes={demandesRecentes}
              membres={membresRecents}
              activitesAPublier={activitesAPublier}
              projets={projetsASuivre}
              t={t}
              language={i18n.language}
            />

            <div className="mb-6">
              <ActivityFeed
                title={t('activityFeed.title', { defaultValue: 'Mon fil d’activité' })}
                subtitle={t('activityFeed.referentSubtitle', { defaultValue: 'Demandes, membres, activités et projets liés à vos groupes.' })}
                emptyLabel={t('activityFeed.empty', { defaultValue: 'Aucune activité récente pour le moment.' })}
                items={buildReferentActivityItems({ demandes: demandesRecentes, membres: membresRecents, activites, projets, t })}
                language={i18n.language}
                accent="teal"
              />
            </div>

            <section className="mb-6 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
              <SectionHeader
                icon="Users"
                title={t('ux.referentDashboard.assignedGroups')}
                subtitle={t('referent.groupsSubtitle', { defaultValue: 'Accès direct aux espaces collaboratifs encadrés.' })}
              />
              {groupes.length === 0 ? (
                <EmptyState
                  title={t('referent.noAssignedGroups')}
                  description={t('referent.noAssignedGroupsDesc', { defaultValue: 'Aucun groupe ne vous est assigné pour le moment.' })}
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {groupes.map(groupe => (
                    <Link key={groupe.id} to={`/groupes/${groupe.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
                      <h3 className="flex items-center gap-2 font-black text-slate-950">
                        <AppIcon name="Users" className="h-4 w-4 text-teal-700" />
                        {groupe.nom}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">{t('groups.members_count', { count: groupe.nombreMembres ?? 0 })}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
              <SectionHeader
                icon="Calendar"
                title={t('ux.referentDashboard.upcomingActivities')}
                subtitle={t('referent.activitiesSubtitle', { defaultValue: 'Les prochaines activités à suivre dans vos groupes.' })}
              />
              {prochainesActivites.length === 0 ? (
                <MiniEmpty icon="Calendar" text={t('referent.noActivitiesYet')} />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {prochainesActivites.map(activite => (
                    <Link key={activite.id} to={`/activites/${activite.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
                      <h3 className="inline-flex items-center gap-2 font-black text-slate-950">
                        <AppIcon name="Calendar" className="h-4 w-4 text-teal-700" />
                        {activite.titre}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">{activite.dateDebut ? formatDate(activite.dateDebut, i18n.language) : t('memberDashboard.activities.dateToConfirm')}</p>
                      {activite.statut && <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{t(`statuses.${activite.statut}`, { defaultValue: activite.statut })}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-6 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
              <SectionHeader
                icon="MessageCircle"
                title={t('memberDashboard.communicationTitle', { defaultValue: 'Communication' })}
                subtitle={t('referent.communicationSubtitle', { defaultValue: 'Un accès unique aux échanges avec les groupes encadrés.' })}
              />
              <Link to="/referent/messagerie" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <AppIcon name="MessageCircle" className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-black text-slate-950">{t('ux.referentDashboard.openMessaging')}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{t('referent.messagingDesc', { defaultValue: 'Contacter les membres et suivre les échanges importants.' })}</span>
                </span>
              </Link>
            </section>
          </>
        )}
    </CollaborativeDashboardLayout>
  )
}

function buildReferentActivityItems({ demandes, membres, activites, projets, t }) {
  const requestItems = demandes.map(demande => ({
    key: `demande-${demande.id}`,
    icon: 'ClipboardList',
    title: t('referent.requestToReview', { defaultValue: 'Demande à valider' }),
    description: `${demande.prenom} ${demande.nom} · ${demande.groupeNom}`,
    date: demande.dateAdhesion || demande.dateCreation,
    to: '/referent/demandes',
  }))

  const memberItems = membres.map(membre => ({
    key: `membre-${membre.groupeNom}-${membre.id}`,
    icon: 'User',
    title: t('referent.memberToWelcome', { defaultValue: 'Nouveau membre à accueillir' }),
    description: `${membre.prenom} ${membre.nom} · ${membre.groupeNom}`,
    date: membre.dateAdhesion || membre.dateCreation,
    to: '/referent/membres',
  }))

  const activityItems = activites.map(activite => ({
    key: `activite-${activite.id}`,
    icon: 'Calendar',
    title: activite.titre,
    description: activite.statut ? t(`statuses.${activite.statut}`, { defaultValue: activite.statut }) : t('nav.activities'),
    date: activite.dateModification || activite.dateCreation || activite.dateDebut,
    to: activite.id ? `/activites/${activite.id}` : '/referent/activites',
  }))

  const projectItems = projets.map(projet => ({
    key: `projet-${projet.id}`,
    icon: 'Rocket',
    title: projet.titre,
    description: projet.statut ? t(`statuses.${projet.statut}`, { defaultValue: projet.statut }) : t('nav.projects'),
    date: projet.dateModification || projet.dateCreation,
    to: projet.id ? `/projets/${projet.id}` : '/referent/projets',
  }))

  return [...requestItems, ...memberItems, ...activityItems, ...projectItems]
}

function ReferentWorkQueue({ demandes, membres, activitesAPublier, projets, t, language }) {
  const actions = [
    ...demandes.map(demande => ({
      key: `demande-${demande.id}`,
      icon: 'Clock',
      title: t('referent.requestToReview', { defaultValue: 'Demande à valider' }),
      description: `${demande.prenom} ${demande.nom} · ${demande.groupeNom}`,
      meta: formatDate(demande.dateAdhesion, language),
      to: '/referent/demandes',
      tone: 'amber',
    })),
    ...membres.slice(0, 2).map(membre => ({
      key: `membre-${membre.groupeNom}-${membre.id}`,
      icon: 'User',
      title: t('referent.memberToWelcome', { defaultValue: 'Nouveau membre à accueillir' }),
      description: `${membre.prenom} ${membre.nom} · ${membre.groupeNom}`,
      to: '/referent/membres',
      tone: 'blue',
    })),
    ...activitesAPublier.map(activite => ({
      key: `activite-${activite.id}`,
      icon: 'Calendar',
      title: t('activities.draftsToPublish', { defaultValue: 'Activité à publier' }),
      description: activite.titre,
      meta: activite.dateDebut ? formatDate(activite.dateDebut, language) : '',
      to: '/referent/activites',
      tone: 'teal',
    })),
    ...projets.map(projet => ({
      key: `projet-${projet.id}`,
      icon: 'Rocket',
      title: t('referent.projectToFollow', { defaultValue: 'Projet à suivre' }),
      description: projet.titre,
      meta: projet.statut,
      to: '/referent/projets',
      tone: 'violet',
    })),
  ]

  return (
    <section className="mb-6 rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-lg shadow-teal-950/5">
      <SectionHeader
        icon="ClipboardList"
        title={t('referent.todayActions', { defaultValue: 'À traiter aujourd’hui' })}
        subtitle={t('referent.todayActionsSubtitle', { defaultValue: 'Uniquement les éléments qui nécessitent une action.' })}
      />

      {actions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
          <AppIcon name="CheckCircle" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{t('referent.noActionToday', { defaultValue: 'Aucune action en attente aujourd’hui' })}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {actions.slice(0, 6).map(action => <ActionItem key={action.key} action={action} />)}
        </div>
      )}
    </section>
  )
}

function ActionItem({ action }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <Link
      to={action.to}
      className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md"
    >
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[action.tone] || tones.teal}`}>
        <AppIcon name={action.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{action.title}</span>
        <span className="mt-0.5 block truncate text-sm text-slate-500">{action.description}</span>
        {action.meta && <span className="mt-1 block text-xs font-bold text-slate-400">{action.meta}</span>}
      </span>
    </Link>
  )
}

function MiniEmpty({ icon, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
      <AppIcon name={icon} className="mx-auto mb-2 h-8 w-8 text-teal-200" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-teal-700" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}

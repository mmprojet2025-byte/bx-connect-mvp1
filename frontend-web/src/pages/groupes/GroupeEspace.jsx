import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import GroupAvatar from '../../components/GroupAvatar'
import AppIcon from '../../components/ui/AppIcons'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/StatusBadge'

const TABS = [
  { id: 'discussion', label: 'Discussion', icon: 'MessageCircle' },
  { id: 'membres', label: 'Membres', icon: 'Users' },
  { id: 'activites', label: 'Activités', icon: 'Calendar' },
  { id: 'projets', label: 'Projets', icon: 'Rocket' },
  { id: 'ressources', label: 'Ressources', icon: 'FileText' },
  { id: 'infos', label: 'Informations', icon: 'BookOpen' },
]

export default function GroupeEspace() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, isMembre } = useAuth()
  const { t, i18n } = useTranslation()
  const [groupe, setGroupe] = useState(null)
  const [adhesions, setAdhesions] = useState([])
  const [activites, setActivites] = useState([])
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const activeTab = TABS.some(tab => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'discussion'

  const fetchWorkspace = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [groupesRes, adhesionsRes, activitesRes, projetsRes] = await Promise.allSettled([
        api.get('/groupes'),
        isAuthenticated && isMembre ? api.get('/groupes/mes-adhesions') : Promise.resolve({ data: [] }),
        api.get('/activites').catch(() => ({ data: [] })),
        api.get('/projets').catch(() => ({ data: [] })),
      ])

      const groupes = groupesRes.status === 'fulfilled' ? groupesRes.value.data : []
      const selected = groupes.find(item => String(item.id) === String(id))
      if (!selected) {
        setError(t('groups.notFound', { defaultValue: 'Groupe introuvable.' }))
        return
      }

      setGroupe(selected)
      setAdhesions(adhesionsRes.status === 'fulfilled' ? adhesionsRes.value.data || [] : [])
      setActivites(filterByGroup(activitesRes.status === 'fulfilled' ? activitesRes.value.data || [] : [], selected))
      setProjets(filterByGroup(projetsRes.status === 'fulfilled' ? projetsRes.value.data || [] : [], selected))
    } catch {
      setError(t('groups.error_load'))
    } finally {
      setLoading(false)
    }
  }, [id, isAuthenticated, isMembre, t])

  useEffect(() => { fetchWorkspace() }, [fetchWorkspace])

  const adhesion = useMemo(
    () => adhesions.find(item => String(item.groupeId) === String(id)),
    [adhesions, id]
  )
  const isMember = adhesion?.statut === 'ACCEPTE'
  const referent = [groupe?.referentPrenom, groupe?.referentNom].filter(Boolean).join(' ')

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error ? (
          <ErrorState title={t('common.loadErrorTitle')} description={error} actionLabel={t('groups.view_groups')} action={() => window.history.back()} />
        ) : groupe && (
          <>
            <header className="mb-5 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <GroupAvatar name={groupe.nom} />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">{t('groups.workspace', { defaultValue: 'Espace collaboratif' })}</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-950">{groupe.nom}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{groupe.description || t('groups.description_soon')}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <InfoChip icon="Users" label={t('groups.members_count', { count: groupe.nombreMembres ?? 0 })} />
                      {referent && <InfoChip icon="User" label={t('groups.referent_label', { referent })} />}
                      {adhesion?.statut && <StatusBadge status={adhesion.statut}>{t(`statuses.${adhesion.statut}`, { defaultValue: adhesion.statut })}</StatusBadge>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={isMember ? '/messagerie' : '/groupes'} className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-600">
                    <AppIcon name="MessageCircle" className="h-4 w-4" />
                    {isMember ? t('messaging.openMessaging', { defaultValue: 'Ouvrir la messagerie' }) : t('ux.groups.joinGroup')}
                  </Link>
                </div>
              </div>
            </header>

            <nav className="mb-5 flex gap-2 overflow-x-auto rounded-[1.25rem] border border-slate-100 bg-white p-2 shadow-sm" aria-label="Navigation groupe">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSearchParams(tab.id === 'discussion' ? {} : { tab: tab.id })}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition ${
                    activeTab === tab.id ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
                  }`}
                >
                  <AppIcon name={tab.icon} className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            <section className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
              {activeTab === 'discussion' && <DiscussionPanel isMember={isMember} t={t} />}
              {activeTab === 'membres' && <MembersPanel groupe={groupe} referent={referent} t={t} />}
              {activeTab === 'activites' && <LinkedItemsPanel type="activites" items={activites} language={i18n.language} t={t} />}
              {activeTab === 'projets' && <LinkedItemsPanel type="projets" items={projets} language={i18n.language} t={t} />}
              {activeTab === 'ressources' && <QuietUnavailable icon="FileText" title="Ressources" description="Les documents du groupe apparaîtront ici dès qu’ils seront disponibles." />}
              {activeTab === 'infos' && <InfoPanel groupe={groupe} referent={referent} t={t} />}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function DiscussionPanel({ isMember, t }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
          <AppIcon name="MessageCircle" className="h-5 w-5 text-blue-700" />
          Discussion du groupe
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isMember
            ? 'Accède à la conversation du groupe pour suivre les échanges et les informations importantes.'
            : 'La discussion est réservée aux membres acceptés du groupe.'}
        </p>
      </div>
      <Link to={isMember ? '/messagerie' : '/groupes'} className={`inline-flex h-fit items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${
        isMember ? 'bg-blue-700 text-white hover:bg-blue-600' : 'bg-slate-100 text-slate-500'
      }`}>
        <AppIcon name={isMember ? 'MessageCircle' : 'Lock'} className="h-4 w-4" />
        {isMember ? t('common.open') : 'Rejoindre pour discuter'}
      </Link>
    </div>
  )
}

function MembersPanel({ groupe, referent, t }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoTile icon="Users" title={t('groups.members')} value={t('groups.members_count', { count: groupe.nombreMembres ?? 0 })} />
      <InfoTile icon="User" title="Référent" value={referent || 'Référent à confirmer'} />
    </div>
  )
}

function LinkedItemsPanel({ type, items, language, t }) {
  const isActivity = type === 'activites'
  if (items.length === 0) {
    return (
      <EmptyState
        icon={isActivity ? 'Calendar' : 'Rocket'}
        title={isActivity ? 'Aucune activité liée à ce groupe.' : 'Aucun projet lié à ce groupe.'}
        description="Les éléments apparaîtront ici lorsque le backend les associera clairement à ce groupe."
        actionLabel={isActivity ? t('activities.viewActivities') : t('nav.projects')}
        actionTo={isActivity ? '/activites' : '/projets'}
      />
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(item => (
        <Link key={item.id} to={isActivity ? `/activites/${item.id}` : `/projets/${item.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
          <h3 className="font-black text-slate-950">{item.titre}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || 'Description à compléter.'}</p>
          <p className="mt-3 text-xs font-bold text-blue-700">
            {isActivity && item.dateDebut ? new Date(item.dateDebut).toLocaleDateString(language || 'fr-BE') : item.statut || 'À suivre'}
          </p>
        </Link>
      ))}
    </div>
  )
}

function InfoPanel({ groupe, referent, t }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoTile icon="BookOpen" title="Description" value={groupe.description || t('groups.description_soon')} />
      <InfoTile icon="User" title="Référent" value={referent || 'Non assigné'} />
      <InfoTile icon="Users" title="Membres" value={t('groups.members_count', { count: groupe.nombreMembres ?? 0 })} />
      <InfoTile icon="Folder" title="Catégorie" value={groupe.categorie || groupe.theme || 'Non renseignée'} />
    </div>
  )
}

function QuietUnavailable({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <AppIcon name={icon} className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <h2 className="font-black text-slate-700">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  )
}

function InfoChip({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
      <AppIcon name={icon} className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function InfoTile({ icon, title, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <AppIcon name={icon} className="mb-3 h-5 w-5 text-blue-700" />
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}

function filterByGroup(items, group) {
  return items.filter(item => (
    String(item.groupeId || '') === String(group.id)
    || item.groupeNom === group.nom
    || item.groupe?.id === group.id
    || item.groupe?.nom === group.nom
  ))
}

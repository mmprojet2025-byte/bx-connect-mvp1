import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import AppIcon from '../../components/ui/AppIcons'
import ActivityFeed from '../../components/dashboard/ActivityFeed'
import {
  CollaborativeDashboardLayout,
} from '../../components/dashboard/CollaborativeDashboard'

export default function AdminDashboard() {
  const [groupes, setGroupes] = useState([])
  const [groupesEnAttente, setGroupesEnAttente] = useState([])
  const [projets, setProjets] = useState([])
  const [soutiens, setSoutiens] = useState([])
  const [activites, setActivites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [groupesRes, attenteRes, projetsRes, soutiensRes, activitesRes] = await Promise.all([
        api.get('/admin/groupes'),
        api.get('/admin/groupes/en-attente'),
        api.get('/projets/admin/tous').catch(() => ({ data: [] })),
        api.get('/partenaire/admin/tous').catch(() => ({ data: [] })),
        api.get('/activites/admin/toutes').catch(() => ({ data: [] })),
      ])
      setGroupes(groupesRes.data)
      setGroupesEnAttente(attenteRes.data)
      setProjets(Array.isArray(projetsRes.data) ? projetsRes.data : [])
      setSoutiens(Array.isArray(soutiensRes.data) ? soutiensRes.data : [])
      setActivites(Array.isArray(activitesRes.data) ? activitesRes.data : [])
    } catch {
      setError(t('admin.error_load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const groupesSansReferent = useMemo(
    () => groupes.filter(groupe => !groupe.referentId),
    [groupes]
  )
  const projetsSoumis = projets.filter(projet => projet.statut === 'SOUMIS')
  const soutiensEnAttente = soutiens.filter(soutien => soutien.statutPaiement === 'EN_ATTENTE')
  const activitesAPublier = activites.filter(activite => activite.statut === 'BROUILLON')

  return (
    <CollaborativeDashboardLayout
      role="ADMIN"
      emoji="Shield"
      title={t('ux.adminDashboard.title', { defaultValue: 'Centre de pilotage BX-Connect' })}
      subtitle={t('admin.dashboardSummary', {
        count: groupesEnAttente.length + projetsSoumis.length + soutiensEnAttente.length + activitesAPublier.length,
        defaultValue: `${groupesEnAttente.length + projetsSoumis.length + soutiensEnAttente.length + activitesAPublier.length} validation(s) en attente`,
      })}
    >
        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-slate-400 text-center py-10">{t('admin.loading')}</p>
        ) : (
          <>
            <AdminQueue
              groupesSansReferent={groupesSansReferent}
              groupesEnAttente={groupesEnAttente}
              projetsSoumis={projetsSoumis}
              soutiensEnAttente={soutiensEnAttente}
              activitesAPublier={activitesAPublier}
              t={t}
            />

            <section className="mb-6 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
              <SectionHeader icon="Folder" title={t('admin.manage')} subtitle={t('admin.managementSubtitle', { defaultValue: 'Accès aux espaces de gestion, sans dupliquer les files d’attente.' })} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <NavCard to="/admin/utilisateurs" title={t('admin.users_title')} description={t('admin.users_desc')} color="#2E86AB" icon="Users" />
                <NavCard to="/admin/referents" title={t('admin.referents_title')} description={t('admin.referents_desc')} color="#0d9488" icon="User" />
                <NavCard to="/admin/groupes" title={t('admin.groups_title')} description={t('admin.groups_desc')} color="#7c3aed" icon="Folder" />
                <NavCard to="/admin/activites" title={t('admin.activities_title')} description={t('admin.activities_desc')} color="#F4A261" icon="Calendar" />
                <NavCard to="/admin/projets" title={t('admin.projects_title')} description={t('admin.projects_desc')} color="#28a745" icon="Rocket" />
                <NavCard to="/admin/soutiens" title={t('partnerSupport.admin.title')} description={t('partnerSupport.admin.dashboardDescription')} color="#ea580c" icon="Handshake" />
              </div>
            </section>

            <ActivityFeed
              title={t('activityFeed.title', { defaultValue: 'Mon fil d’activité' })}
              subtitle={t('activityFeed.adminSubtitle', { defaultValue: 'Validations, créations et changements de statut à surveiller.' })}
              emptyLabel={t('admin.noRecentActivity', { defaultValue: 'Aucune activité récente à afficher.' })}
              items={buildAdminActivityItems({ groupesEnAttente, groupesSansReferent, projets, soutiens, activites, t })}
              accent="blue"
            />

            {groupes.length === 0 && (
              <div className="mt-8">
                <EmptyState
                  title={t('admin.noGroupsCreated')}
                  description={t('admin.noGroupsCreatedDesc')}
                  actionLabel={t('admin.createGroup')}
                  actionTo="/admin/groupes"
                />
              </div>
            )}
          </>
        )}
    </CollaborativeDashboardLayout>
  )
}

function buildAdminActivityItems({ groupesEnAttente, groupesSansReferent, projets, soutiens, activites, t }) {
  const groupItems = [
    ...groupesEnAttente.map(groupe => ({
      key: `groupe-attente-${groupe.id}`,
      icon: 'Users',
      title: t('ux.adminDashboard.pendingGroups'),
      description: groupe.nom,
      date: groupe.dateCreation || groupe.dateDemande,
      to: '/admin/groupes',
    })),
    ...groupesSansReferent.map(groupe => ({
      key: `groupe-sans-referent-${groupe.id}`,
      icon: 'User',
      title: t('ux.adminDashboard.groupsWithoutReferent'),
      description: groupe.nom,
      date: groupe.dateModification || groupe.dateCreation,
      to: '/admin/groupes',
    })),
  ]

  const projectItems = projets.map(projet => ({
    key: `projet-${projet.id}`,
    icon: 'Rocket',
    title: projet.titre,
    description: projet.statut ? t(`statuses.${projet.statut}`, { defaultValue: projet.statut }) : t('nav.projects'),
    date: projet.dateModification || projet.dateCreation,
    to: '/admin/projets',
  }))

  const supportItems = soutiens.map(soutien => ({
    key: `soutien-${soutien.id}`,
    icon: 'Handshake',
    title: soutien.projetTitre || soutien.activiteTitre || t('nav.supports', { defaultValue: 'Soutien partenaire' }),
    description: soutien.statutPaiement || t('partnerSupport.admin.title'),
    date: soutien.dateCreation || soutien.datePaiement,
    to: `/admin/soutiens?soutien=${soutien.id}`,
  }))

  const activityItems = activites.map(activite => ({
    key: `activite-${activite.id}`,
    icon: 'Calendar',
    title: activite.titre,
    description: activite.statut ? t(`statuses.${activite.statut}`, { defaultValue: activite.statut }) : t('nav.activities'),
    date: activite.dateModification || activite.dateCreation || activite.dateDebut,
    to: '/admin/activites',
  }))

  return [...groupItems, ...projectItems, ...supportItems, ...activityItems]
}

function AdminQueue({ groupesSansReferent, groupesEnAttente, projetsSoumis, soutiensEnAttente, activitesAPublier, t }) {
  const items = [
    {
      icon: 'User',
      label: t('ux.adminDashboard.groupsWithoutReferent'),
      value: groupesSansReferent.length,
      description: t('admin.assignReferentDesc'),
      to: '/admin/groupes',
    },
    {
      icon: 'Clock',
      label: t('ux.adminDashboard.pendingGroups'),
      value: groupesEnAttente.length,
      description: t('admin.pendingGroupsDesc'),
      to: '/admin/groupes',
    },
    {
      icon: 'Rocket',
      label: t('statuses.SOUMIS', { defaultValue: 'Projets soumis' }),
      value: projetsSoumis.length,
      description: t('admin.submittedProjectsDesc', { defaultValue: 'Projets à relire ou orienter.' }),
      to: '/admin/projets',
    },
    {
      icon: 'Handshake',
      label: t('nav.supports', { defaultValue: 'Soutiens partenaires' }),
      value: soutiensEnAttente.length,
      description: t('partnerSupport.admin.listDescription', { defaultValue: 'Soutiens à valider ou refuser.' }),
      to: '/admin/soutiens',
    },
    {
      icon: 'Calendar',
      label: t('activities.draftsToPublish', { defaultValue: 'Activités à publier' }),
      value: activitesAPublier.length,
      description: t('activities.draftsToPublishDesc', { defaultValue: 'Brouillons prêts à vérifier.' }),
      to: '/admin/activites',
    },
  ]
  const activeItems = items.filter(item => item.value > 0)

  return (
    <section className="mb-6 rounded-[1.5rem] border border-amber-100 bg-white p-5 shadow-lg shadow-amber-950/5">
      <SectionHeader icon="TriangleAlert" title={t('ux.adminDashboard.priority')} subtitle={t('ux.adminDashboard.priorityDesc')} />
      {activeItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
          <AppIcon name="CheckCircle" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{t('admin.noPendingValidation', { defaultValue: 'Aucune validation en attente.' })}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeItems.slice(0, 5).map(item => <PriorityCard key={item.label} {...item} />)}
        </div>
      )}
    </section>
  )
}

function PriorityCard({ icon, label, value, description, to }) {
  return (
    <Link to={to} className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{value} · {label}</span>
        <span className="mt-0.5 block text-sm leading-5 text-slate-500">{description}</span>
      </span>
    </Link>
  )
}

function NavCard({ to, title, description, color, icon }) {
  return (
    <Link to={to} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white" style={{ color }}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <h3 className="font-black text-slate-950 mb-1">{title}</h3>
      <p className="line-clamp-2 text-slate-500 text-sm">{description}</p>
    </Link>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-blue-700" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

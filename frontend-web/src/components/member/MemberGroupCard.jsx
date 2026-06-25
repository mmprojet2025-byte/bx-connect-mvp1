import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function MemberGroupCard({ groupe, referent, messagerieDisponible }) {
  const { t } = useTranslation()
  const statut = groupe?.statutAdhesion

  if (!groupe) {
    return (
      <section className="collab-reveal overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-blue-700 via-teal-600 to-emerald-500" />
        <div className="p-3.5">
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">{t('memberDashboard.group.newMember')}</span>
          <h2 className="text-xl font-bold text-blue-900 mt-3">{t('memberDashboard.group.joinGroup')}</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-2xl">
            {t('memberDashboard.group.noGroupDescription')}
          </p>
          <Link to="/groupes" className="inline-block mt-4 bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            {t('memberDashboard.buttons.discoverGroups')}
          </Link>
        </div>
      </section>
    )
  }

  const demandeEnAttente = statut === 'EN_ATTENTE'
  const statutLabel = demandeEnAttente ? t('memberDashboard.status.pendingTitle') : t('memberDashboard.status.acceptedLabel')
  const referentLabel = referent ? `${referent.prenom} ${referent.nom}` : t('memberDashboard.group.referentPending')

  return (
    <section className="collab-reveal overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:border-blue-100 hover:shadow-md">
      <div className="h-1 bg-gradient-to-r from-blue-700 via-teal-600 to-emerald-500" />
      <div className="p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${demandeEnAttente ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
              {statutLabel}
            </span>
            <h2 className="mt-2 text-xl font-bold text-blue-900">{groupe.nom}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <InfoPill label={t('memberDashboard.group.status')} value={statutLabel} />
              <InfoPill label={t('memberDashboard.group.referent')} value={referentLabel} />
            </div>
            {groupe.description && (
              <p className="text-gray-500 text-sm mt-2 max-w-2xl line-clamp-2">{groupe.description}</p>
            )}
          </div>
          <div className="grid min-w-[180px] grid-cols-2 gap-2">
            <Metric label={t('memberDashboard.group.members')} value={groupe.nombreMembres ?? 0} />
            <Metric label={t('memberDashboard.group.upcomingActivities')} value={groupe.nombreActivitesAVenir ?? 0} />
          </div>
        </div>

        <ReferentSummary
          referent={referent}
          groupe={groupe}
          messagerieDisponible={messagerieDisponible}
          t={t}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/groupes" className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            {t('memberDashboard.buttons.openMyGroup')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function InfoPill({ label, value }) {
  return (
    <span className="bg-gray-50 border border-gray-100 text-gray-600 rounded-full px-3 py-1">
      <strong className="text-gray-800">{label} :</strong> {value}
    </span>
  )
}

function ReferentSummary({ referent, groupe, messagerieDisponible, t }) {
  if (!referent || groupe?.statutAdhesion !== 'ACCEPTE') {
    return (
      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {groupe?.statutAdhesion === 'EN_ATTENTE'
            ? t('memberDashboard.referent.pending')
            : t('memberDashboard.referent.empty')}
        </span>
        {messagerieDisponible && groupe?.statutAdhesion === 'ACCEPTE' && (
          <Link to="/messagerie" className="inline-flex justify-center rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-600">
            {t('memberDashboard.buttons.message')}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {referent.photoUrl ? (
          <img src={referent.photoUrl} alt={`${referent.prenom || ''} ${referent.nom || ''}`.trim()} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
            {initiales(referent)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-blue-900">{referent.prenom} {referent.nom}</p>
          <p className="truncate text-xs text-gray-500">{referent.email || t('memberDashboard.referent.notProvided')}</p>
        </div>
      </div>
      {messagerieDisponible && (
        <Link to="/messagerie" className="inline-flex justify-center rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-600">
          {t('memberDashboard.buttons.message')}
        </Link>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className="text-lg font-bold text-blue-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function initiales(referent) {
  return `${referent.prenom?.[0] || ''}${referent.nom?.[0] || ''}`.toUpperCase() || '?'
}

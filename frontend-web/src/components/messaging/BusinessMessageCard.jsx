import { Link } from 'react-router-dom'
import AppIcon from '../ui/AppIcons'

const CARD_STYLES = {
  activity: {
    icon: 'Calendar',
    wrapper: 'border-blue-100 bg-blue-50/80 text-blue-900',
    iconBox: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-700 text-white hover:bg-blue-600',
  },
  project: {
    icon: 'Rocket',
    wrapper: 'border-indigo-100 bg-indigo-50/80 text-indigo-900',
    iconBox: 'bg-indigo-100 text-indigo-700',
    button: 'bg-indigo-700 text-white hover:bg-indigo-600',
  },
  opportunity: {
    icon: 'Megaphone',
    wrapper: 'border-amber-100 bg-amber-50/80 text-amber-900',
    iconBox: 'bg-amber-100 text-amber-700',
    button: 'bg-amber-700 text-white hover:bg-amber-600',
  },
  support: {
    icon: 'Handshake',
    wrapper: 'border-emerald-100 bg-emerald-50/80 text-emerald-900',
    iconBox: 'bg-emerald-100 text-emerald-700',
    button: 'bg-emerald-700 text-white hover:bg-emerald-600',
  },
  group: {
    icon: 'Users',
    wrapper: 'border-teal-100 bg-teal-50/80 text-teal-900',
    iconBox: 'bg-teal-100 text-teal-700',
    button: 'bg-teal-700 text-white hover:bg-teal-600',
  },
  info: {
    icon: 'Sparkles',
    wrapper: 'border-slate-200 bg-white text-slate-800',
    iconBox: 'bg-slate-100 text-slate-600',
    button: 'bg-slate-800 text-white hover:bg-slate-700',
  },
}

export default function BusinessMessageCard({ type = 'info', data, t, language }) {
  if (!data || typeof data !== 'object') return null

  const config = CARD_STYLES[type] || CARD_STYLES.info
  const title = getTitle(type, data)
  if (!title) return null

  const meta = getMeta(type, data, t, language).filter(Boolean)
  const target = getTarget(type, data)
  const actionLabel = getActionLabel(type, t)

  return (
    <article className={`w-full max-w-md rounded-xl border px-3 py-3 shadow-sm ${config.wrapper}`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${config.iconBox}`}>
          <AppIcon name={config.icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide opacity-70">
            {t(`messaging.business.${type}`, { defaultValue: t('messaging.business.info') })}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-black">{title}</h3>
          {meta.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {meta.map(item => (
                <span key={item} className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-current ring-1 ring-black/5">
                  {item}
                </span>
              ))}
            </div>
          )}
          {data.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed opacity-80">{data.description}</p>
          )}
        </div>
      </div>
      {target && (
        <div className="mt-3 flex justify-end">
          <Link
            to={target}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${config.button}`}
          >
            {actionLabel}
            <AppIcon name="ArrowRight" className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </article>
  )
}

export function getBusinessPayload(message) {
  if (!message || typeof message !== 'object') return null

  const candidates = [
    ['activity', message.activite || message.activity],
    ['project', message.projet || message.project],
    ['opportunity', message.opportunite || message.opportunity],
    ['support', message.soutien || message.support || message.soutienPartenaire || message.partnerSupport],
    ['group', message.groupeInfo || message.groupInfo || message.groupeEvent || message.groupEvent],
  ]

  const match = candidates.find(([, value]) => value && typeof value === 'object')
  if (match) return { type: match[0], data: match[1] }

  const rawType = String(message.type || message.typeMessage || message.categorie || '').toUpperCase()
  const payload = message.payload || message.metadata || message.details
  if (!payload || typeof payload !== 'object') return null

  if (rawType.includes('ACTIVITE') || rawType.includes('ACTIVITY')) return { type: 'activity', data: payload }
  if (rawType.includes('PROJET') || rawType.includes('PROJECT')) return { type: 'project', data: payload }
  if (rawType.includes('OPPORTUNITE') || rawType.includes('OPPORTUNITY')) return { type: 'opportunity', data: payload }
  if (rawType.includes('SOUTIEN') || rawType.includes('SUPPORT')) return { type: 'support', data: payload }
  if (rawType.includes('GROUPE') || rawType.includes('GROUP') || rawType.includes('MEMBRE') || rawType.includes('MEMBER')) {
    return { type: 'group', data: payload }
  }

  return null
}

function getTitle(type, data) {
  if (type === 'support') {
    return data.partenaire || data.partenaireNom || data.organisation || data.nomPartenaire
  }
  if (type === 'group') {
    return data.titre || data.nom || data.nomGroupe || data.membre || data.nouvelAdherent
  }
  return data.titre || data.nom || data.libelle || data.name
}

function getMeta(type, data, t, language) {
  if (type === 'activity') {
    return [
      formatDate(data.dateDebut || data.date || data.startDate, language),
      data.lieu || data.adresse || data.commune,
    ]
  }
  if (type === 'project') {
    return [formatStatus(data.statut || data.status, t)]
  }
  if (type === 'opportunity') {
    return [
      formatOpportunityType(data.type || data.typeOpportunite, t),
      formatDate(data.dateLimite || data.deadline, language),
      formatEnumLabel(data.publicCible, t, 'messaging.business.publicTargets'),
    ]
  }
  if (type === 'support') {
    return [
      formatAmount(data.montant || data.amount),
      formatStatus(data.statut || data.status, t),
    ]
  }
  if (type === 'group') {
    return [
      formatStatus(data.statut || data.status, t),
      data.referent || data.referentNom,
    ]
  }
  return []
}

function getTarget(type, data) {
  if (!data.id) return null
  if (type === 'activity') return `/activites/${data.id}`
  if (type === 'project') return `/projets/${data.id}`
  if (type === 'opportunity') return '/annonces'
  if (type === 'group') return `/groupes/${data.id}`
  return null
}

function getActionLabel(type, t) {
  if (type === 'project') return t('messaging.business.open')
  return t('messaging.business.view')
}

function formatDate(value, language) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: 'short' })
}

function formatAmount(value) {
  if (value == null || value === '') return ''
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatStatus(value, t) {
  if (!value) return ''
  return t(`statuses.${String(value).toUpperCase()}`, { defaultValue: humanizeEnum(value) })
}

function formatOpportunityType(value, t) {
  if (!value) return ''
  const key = String(value).toUpperCase()
  return t(`opportunityCategories.${key}`, {
    defaultValue: t(`messaging.business.opportunityTypes.${key}`, { defaultValue: humanizeEnum(value) }),
  })
}

function formatEnumLabel(value, t, keyPrefix) {
  if (!value) return ''
  const key = String(value).toUpperCase()
  return t(`${keyPrefix}.${key}`, { defaultValue: humanizeEnum(value) })
}

function humanizeEnum(value) {
  return String(value)
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^\p{L}/u, char => char.toUpperCase())
}

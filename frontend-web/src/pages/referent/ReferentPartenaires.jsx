import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { userFriendlyError } from '../../utils/userFriendlyError'

export default function ReferentPartenaires() {
  const { t, i18n } = useTranslation()
  const [partenaires, setPartenaires] = useState([])
  const [impact, setImpact] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [search, setSearch] = useState('')

  const fetchPartenaires = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [partenairesRes, impactRes] = await Promise.all([
        api.get('/referent/partenaires'),
        api.get('/referent/partenaires/impact'),
      ])
      const nextPartenaires = Array.isArray(partenairesRes.data) ? partenairesRes.data : []
      setPartenaires(nextPartenaires)
      setImpact(impactRes.data || null)
      setSelectedId(current => current || nextPartenaires[0]?.partenaireProfilId || null)
    } catch (err) {
      setError(userFriendlyError(err, t('referentPartners.errors.load')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchPartenaires() }, [fetchPartenaires])

  const loadDetail = useCallback(async (partenaireProfilId) => {
    if (!partenaireProfilId) return
    setSelectedId(partenaireProfilId)
    setDetailLoading(true)
    setDetailError('')
    try {
      const response = await api.get(`/referent/partenaires/${partenaireProfilId}`)
      setSelectedDetail(response.data)
    } catch (err) {
      setSelectedDetail(null)
      setDetailError(userFriendlyError(err, t('referentPartners.errors.detail')))
    } finally {
      setDetailLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!selectedId) return
    loadDetail(selectedId)
  }, [loadDetail, selectedId])

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return partenaires
    return partenaires.filter(partenaire => [
      partenaire.nomOrganisation,
      partenaire.typePartenaire,
      partenaire.description,
      partenaire.groupesLies?.map(groupe => groupe.groupeNom).join(' '),
      partenaire.referentsLies?.map(referent => `${referent.referentPrenom || ''} ${referent.referentNom || ''}`).join(' '),
    ].filter(Boolean).join(' ').toLowerCase().includes(query))
  }, [partenaires, search])

  const model = useMemo(
    () => buildPartnerModel(partenaires, impact, t),
    [partenaires, impact, t],
  )

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <PageHeader
          eyebrow={t('referentPartners.eyebrow')}
          title={t('referentPartners.title')}
          description={t('referentPartners.description')}
        />

        {loading ? (
          <LoadingState label={t('referentPartners.loading')} />
        ) : error && partenaires.length === 0 ? (
          <ErrorState
            title={t('referentPartners.errors.title')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchPartenaires}
          />
        ) : partenaires.length === 0 ? (
          <EmptyState
            icon="Handshake"
            title={t('referentPartners.empty.title')}
            description={t('referentPartners.empty.description')}
          />
        ) : (
          <div className="space-y-6">
            {error && (
              <Alert type="error">{error}</Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon="Handshake" label={t('referentPartners.kpis.partners')} value={model.kpis.partners} />
              <Kpi icon="User" label={t('referentPartners.kpis.directLinks')} value={model.kpis.directLinks} tone="blue" />
              <Kpi icon="Users" label={t('referentPartners.kpis.groupLinks')} value={model.kpis.groupLinks} tone="green" />
              <Kpi icon="AlertTriangle" label={t('referentPartners.kpis.toClarify')} value={model.kpis.toClarify} tone="amber" />
            </div>

            <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
              <SectionCard
                title={t('referentPartners.list.title')}
                subtitle={t('referentPartners.list.subtitle')}
                action={<span className="text-sm font-black text-slate-500">{filteredPartners.length}/{partenaires.length}</span>}
              >
                <label className="relative mb-4 block">
                  <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={t('referentPartners.searchPlaceholder')}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </label>

                {filteredPartners.length === 0 ? (
                  <EmptyState
                    icon="Search"
                    title={t('common.noResults')}
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredPartners.map(partenaire => (
                      <PartnerCard
                        key={partenaire.partenaireProfilId}
                        partenaire={partenaire}
                        selected={selectedId === partenaire.partenaireProfilId}
                        onSelect={() => setSelectedId(partenaire.partenaireProfilId)}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title={t('referentPartners.impact.title')}
                subtitle={t('referentPartners.impact.subtitle')}
              >
                {detailLoading ? (
                  <LoadingState label={t('referentPartners.impact.loading')} />
                ) : detailError ? (
                  <ErrorState
                    title={t('referentPartners.errors.detailTitle')}
                    description={detailError}
                    actionLabel={t('common.retry')}
                    action={() => loadDetail(selectedId)}
                  />
                ) : selectedDetail ? (
                  <PartnerDetail partenaire={selectedDetail} t={t} language={i18n.language} />
                ) : (
                  <EmptyState
                    icon="Eye"
                    title={t('referentPartners.impact.selectPartner')}
                  />
                )}
              </SectionCard>
            </section>

            <SectionCard
              title={t('referentPartners.quality.title')}
              subtitle={t('referentPartners.quality.subtitle')}
            >
              <div className="grid gap-3 md:grid-cols-3">
                {model.quality.map(item => (
                  <QualityItem key={item.key} item={item} />
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function buildPartnerModel(partenaires, impact, t) {
  const directLinks = Number(impact?.liensDirectsReferent ?? partenaires.filter(partenaire => partenaire.lienDirectReferent).length)
  const groupLinks = Number(impact?.liensGroupes ?? partenaires.reduce((sum, partenaire) => sum + (partenaire.groupesLies?.length || 0), 0))
  const withoutGroup = partenaires.filter(partenaire => (partenaire.groupesLies?.length || 0) === 0).length
  const withoutDirectReferent = partenaires.filter(partenaire => !partenaire.lienDirectReferent).length
  const withoutDescription = partenaires.filter(partenaire => !partenaire.description).length

  return {
    kpis: {
      partners: Number(impact?.partenaires ?? partenaires.length),
      directLinks,
      groupLinks,
      toClarify: withoutGroup + withoutDirectReferent + withoutDescription,
    },
    quality: [
      {
        key: 'withoutGroup',
        value: withoutGroup,
        label: t('referentPartners.quality.withoutGroup'),
        description: t('referentPartners.quality.withoutGroupDesc'),
        tone: withoutGroup > 0 ? 'amber' : 'green',
      },
      {
        key: 'withoutDirectReferent',
        value: withoutDirectReferent,
        label: t('referentPartners.quality.withoutDirectReferent'),
        description: t('referentPartners.quality.withoutDirectReferentDesc'),
        tone: withoutDirectReferent > 0 ? 'amber' : 'green',
      },
      {
        key: 'withoutDescription',
        value: withoutDescription,
        label: t('referentPartners.quality.withoutDescription'),
        description: t('referentPartners.quality.withoutDescriptionDesc'),
        tone: withoutDescription > 0 ? 'amber' : 'green',
      },
    ],
  }
}

function PartnerCard({ partenaire, selected, onSelect, t }) {
  const groupCount = partenaire.groupesLies?.length || 0
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition ${selected ? 'border-teal-200 bg-teal-50' : 'border-slate-100 bg-white hover:border-teal-100 hover:bg-slate-50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{partenaire.nomOrganisation}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{partenaire.typePartenaire || t('referentPartners.unknownType')}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${partenaire.lienDirectReferent ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
          {partenaire.lienDirectReferent ? t('referentPartners.direct') : t('referentPartners.byGroup')}
        </span>
      </div>
      {partenaire.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{partenaire.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-500">
        <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-100">
          {t('referentPartners.groupCount', { count: groupCount })}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-100">
          {t('referentPartners.referentCount', { count: partenaire.referentsLies?.length || 0 })}
        </span>
      </div>
    </button>
  )
}

function PartnerDetail({ partenaire, t, language }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
            <AppIcon name="Handshake" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black text-slate-950">{partenaire.nomOrganisation}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{partenaire.typePartenaire || t('referentPartners.unknownType')}</p>
            {partenaire.siteWeb && (
              <a
                href={normalizeUrl(partenaire.siteWeb)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-black text-teal-700 hover:text-teal-600"
              >
                {t('referentPartners.website')}
              </a>
            )}
          </div>
        </div>
        {partenaire.description && (
          <p className="mt-4 text-sm leading-6 text-slate-600">{partenaire.description}</p>
        )}
      </div>

      <DetailSection
        icon="Users"
        title={t('referentPartners.impact.groupsTitle')}
        empty={t('referentPartners.impact.noGroups')}
        items={partenaire.groupesLies || []}
        renderItem={item => (
          <div>
            <p className="font-black text-slate-900">{item.groupeNom}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {t('referentPartners.linkType')}: {t(`referentPartners.linkTypes.${item.typeLien || 'AUTRE'}`)}
            </p>
            <p className="mt-1 text-xs text-slate-400">{t('referentPartners.startedAt')}: {formatDate(item.dateDebut || item.createdAt, language)}</p>
          </div>
        )}
      />

      <DetailSection
        icon="User"
        title={t('referentPartners.impact.referentsTitle')}
        empty={t('referentPartners.impact.noReferents')}
        items={partenaire.referentsLies || []}
        renderItem={item => (
          <div>
            <p className="font-black text-slate-900">
              {[item.referentPrenom, item.referentNom].filter(Boolean).join(' ') || item.referentEmail}
            </p>
            <p className="mt-1 text-xs text-slate-400">{t('referentPartners.startedAt')}: {formatDate(item.dateDebut || item.createdAt, language)}</p>
          </div>
        )}
      />
    </div>
  )
}

function DetailSection({ icon, title, empty, items, renderItem }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-4">
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-950">
        <AppIcon name={icon} className="h-4 w-4 text-teal-700" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <article key={item.id} className="rounded-lg bg-slate-50 p-3">
              {renderItem(item)}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function Kpi({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-sky-50 text-sky-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone] || tones.slate}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </div>
  )
}

function QualityItem({ item }) {
  const tone = item.tone === 'green'
    ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
    : 'border-amber-100 bg-amber-50 text-amber-800'
  return (
    <article className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-2xl font-black">{item.value}</p>
      <h3 className="mt-1 text-sm font-black">{item.label}</h3>
      <p className="mt-2 text-xs font-semibold opacity-80">{item.description}</p>
    </article>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${styles}`}>{children}</div>
}

function normalizeUrl(url) {
  if (!url) return '#'
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function formatDate(value, language) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(language || 'fr-BE')
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError'
import { SUPPORT_STATUS_STYLES, supportStatusLabel } from '../../utils/supportStatus'

export default function AdminSoutiens() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const [soutiens, setSoutiens] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('EN_ATTENTE')
  const [search, setSearch] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL')
  const [selectedSupport, setSelectedSupport] = useState(null)
  const [decision, setDecision] = useState(null)
  const [adminReply, setAdminReply] = useState('')
  const focusedSupportId = searchParams.get('soutien')

  const fetchSoutiens = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/partenaire/admin/tous')
      setSoutiens(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setError(userFriendlyError(err, t('partnerSupport.admin.loadError')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchSoutiens()
  }, [fetchSoutiens])

  useEffect(() => {
    if (!focusedSupportId || soutiens.length === 0) return
    const soutien = soutiens.find(item => String(item.id) === String(focusedSupportId))
    if (!soutien) return
    setFilter(soutien.statutPaiement || 'EN_ATTENTE')
    setSelectedSupport(soutien)
  }, [focusedSupportId, soutiens])

  const traiterSoutien = async (soutien, action, commentaireAdmin = '') => {
    const confirmationKey = action === 'valider' ? 'confirmApprove' : 'confirmReject'
    if (!confirmSensitiveAction(t(`partnerSupport.admin.${confirmationKey}`, {
      name: `${soutien.partenairePrenom || ''} ${soutien.partenaireNom || ''}`.trim(),
    }))) return

    setProcessingId(soutien.id)
    setError('')
    setMessage('')
    try {
      const response = await api.patch(`/partenaire/admin/${soutien.id}/${action}`, { commentaireAdmin })
      setSoutiens(current => current.map(item => item.id === soutien.id ? response.data : item))
      setSelectedSupport(current => current?.id === soutien.id ? response.data : current)
      setDecision(null)
      setAdminReply('')
      setMessage(t(action === 'valider'
        ? 'partnerSupport.admin.approved'
        : 'partnerSupport.admin.rejected'))
    } catch (err) {
      setError(userFriendlyError(err, t('partnerSupport.admin.actionError')))
    } finally {
      setProcessingId(null)
    }
  }

  const partners = useMemo(() => {
    const unique = new Map()
    soutiens.forEach((soutien) => {
      const key = soutien.partenaireEmail || `${soutien.partenairePrenom || ''}-${soutien.partenaireNom || ''}`
      if (!key) return
      unique.set(key, {
        key,
        label: `${soutien.partenairePrenom || ''} ${soutien.partenaireNom || ''}`.trim() || soutien.partenaireEmail,
      })
    })
    return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [soutiens])

  const filteredSupports = useMemo(() => {
    const query = search.trim().toLowerCase()
    return soutiens.filter((soutien) => {
      const targetType = soutien.projetTitre ? 'PROJET' : 'ACTIVITE'
      const partnerKey = soutien.partenaireEmail || `${soutien.partenairePrenom || ''}-${soutien.partenaireNom || ''}`
      const haystack = [
        soutien.projetTitre,
        soutien.activiteTitre,
        soutien.partenairePrenom,
        soutien.partenaireNom,
        soutien.partenaireEmail,
        soutien.message,
        soutien.reponseAdmin,
        soutien.montant,
      ].filter(Boolean).join(' ').toLowerCase()

      return (!query || haystack.includes(query))
        && (!partnerFilter || partnerKey === partnerFilter)
        && (targetTypeFilter === 'ALL' || targetType === targetTypeFilter)
    })
  }, [partnerFilter, search, soutiens, targetTypeFilter])

  const displayedSupports = useMemo(
    () => filteredSupports.filter(soutien => soutien.statutPaiement === filter),
    [filter, filteredSupports],
  )

  const stats = {
    total: soutiens.length,
    pending: soutiens.filter(item => item.statutPaiement === 'EN_ATTENTE').length,
    accepted: soutiens.filter(item => item.statutPaiement === 'PAYE').length,
    rejected: soutiens.filter(item => item.statutPaiement === 'REMBOURSE').length,
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('partnerSupport.admin.eyebrow')}
          title={t('partnerSupport.admin.title')}
          description={t('partnerSupport.admin.description')}
        />

        <div className="mb-6 rounded-[1.5rem] border border-slate-100 bg-white p-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-3">
            <StatusTab active={filter === 'EN_ATTENTE'} icon="Clock" label={t('partnerSupport.statuses.EN_ATTENTE')} value={stats.pending} onClick={() => setFilter('EN_ATTENTE')} />
            <StatusTab active={filter === 'PAYE'} icon="CheckCircle" label={t('partnerSupport.statuses.PAYE')} value={stats.accepted} onClick={() => setFilter('PAYE')} />
            <StatusTab active={filter === 'REMBOURSE'} icon="XCircle" label={t('partnerSupport.statuses.REMBOURSE')} value={stats.rejected} onClick={() => setFilter('REMBOURSE')} />
          </div>
        </div>

        {message && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && soutiens.length > 0 && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mb-6 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">
                {t('common.search', { defaultValue: 'Recherche' })}
              </span>
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={t('partnerSupport.admin.searchPlaceholder', { defaultValue: 'Projet, activité, partenaire, message...' })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">
                {t('partnerSupport.admin.partnerFilter', { defaultValue: 'Partenaire' })}
              </span>
              <select
                value={partnerFilter}
                onChange={event => setPartnerFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">{t('partnerSupport.admin.allPartners', { defaultValue: 'Tous les partenaires' })}</option>
                {partners.map(partner => (
                  <option key={partner.key} value={partner.key}>{partner.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">
                {t('partnerSupport.admin.targetType', { defaultValue: 'Type cible' })}
              </span>
              <select
                value={targetTypeFilter}
                onChange={event => setTargetTypeFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="ALL">{t('partnerSupport.admin.allTargets', { defaultValue: 'Projets et activités' })}</option>
                <option value="PROJET">{t('partnerSupport.project')}</option>
                <option value="ACTIVITE">{t('partnerSupport.activity')}</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setPartnerFilter('')
                setTargetTypeFilter('ALL')
              }}
              className="self-end rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-200"
            >
              {t('common.reset', { defaultValue: 'Réinitialiser' })}
            </button>
          </div>
        </section>

        <SectionCard
          title={filter === 'EN_ATTENTE'
            ? t('partnerSupport.admin.toProcessTitle', { defaultValue: 'À traiter' })
            : t('partnerSupport.admin.historyTitle', { defaultValue: 'Historique' })}
          subtitle={filter === 'EN_ATTENTE'
            ? t('partnerSupport.admin.toProcessDescription', { defaultValue: 'Soutiens en attente de réponse, validation ou refus.' })
            : t('partnerSupport.admin.historyDescription', { defaultValue: 'Soutiens déjà validés ou refusés avec la réponse admin.' })}
          action={<span className="text-sm font-black text-slate-500">{displayedSupports.length}/{filteredSupports.length}</span>}
        >
          {loading ? (
            <LoadingState label={t('partnerSupport.admin.loading')} />
          ) : error && soutiens.length === 0 ? (
            <ErrorState
              description={error}
              actionLabel={t('common.retry')}
              action={fetchSoutiens}
            />
          ) : displayedSupports.length === 0 ? (
            <EmptyState
              icon="Wallet"
              title={t('partnerSupport.admin.empty')}
              description={t('partnerSupport.admin.emptyDescription')}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {displayedSupports.map(soutien => (
                <SupportCard
                  key={soutien.id}
                  soutien={soutien}
                  language={i18n.language}
                  processing={processingId === soutien.id}
                  focused={String(soutien.id) === String(focusedSupportId)}
                  onOpen={() => setSelectedSupport(soutien)}
                  onReply={(action) => {
                    setSelectedSupport(soutien)
                    setDecision(action)
                    setAdminReply(soutien.reponseAdmin || '')
                  }}
                  t={t}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {selectedSupport && (
          <SupportDetailModal
            soutien={selectedSupport}
            language={i18n.language}
            decision={decision}
            adminReply={adminReply}
            processing={processingId === selectedSupport.id}
            onReplyChange={setAdminReply}
            onClose={() => {
              setSelectedSupport(null)
              setDecision(null)
              setAdminReply('')
            }}
            onStartDecision={setDecision}
            onSubmitDecision={() => traiterSoutien(selectedSupport, decision, adminReply)}
            t={t}
          />
        )}
      </main>
      <Footer />
    </div>
  )
}

function SupportCard({ soutien, language, processing, focused, onOpen, onReply, t }) {
  const partnerName = `${soutien.partenairePrenom || ''} ${soutien.partenaireNom || ''}`.trim()
  const target = soutien.projetTitre || soutien.activiteTitre || t('partnerSupport.admin.unknownTarget')
  const targetType = soutien.projetTitre
    ? t('partnerSupport.project')
    : t('partnerSupport.activity')
  const pending = soutien.statutPaiement === 'EN_ATTENTE'

  return (
    <article className={`rounded-2xl border bg-slate-50/70 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-md ${
      focused ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <AppIcon name={soutien.projetTitre ? 'Rocket' : 'Calendar'} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-orange-600">{targetType}</p>
            <h3 className="truncate font-black text-slate-950">{target}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {partnerName || t('partnerSupport.admin.unknownPartner')}
              {soutien.partenaireEmail ? ` · ${soutien.partenaireEmail}` : ''}
            </p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${SUPPORT_STATUS_STYLES[soutien.statutPaiement] || 'bg-slate-100 text-slate-700'}`}>
          {supportStatusLabel(soutien.statutPaiement, t)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white p-3">
        <Meta label={t('partnerSupport.amount')} value={`${soutien.montant || 0} €`} />
        <Meta
          label={t('partnerSupport.date')}
          value={soutien.dateCreation
            ? new Date(soutien.dateCreation).toLocaleDateString(language || 'fr-BE')
            : '—'}
        />
      </div>

      {soutien.message && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-xs font-bold text-slate-500">{t('partnerSupport.comment')}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{soutien.message}</p>
        </div>
      )}

      {soutien.reponseAdmin && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-bold text-blue-700">{t('partnerSupport.admin.adminReply', { defaultValue: 'Réponse admin' })}</p>
          <p className="mt-1 text-sm leading-relaxed text-blue-950">{soutien.reponseAdmin}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
        >
          <AppIcon name="Eye" className="h-4 w-4" />
          {t('common.open', { defaultValue: 'Ouvrir' })}
        </button>
        {pending && (
          <>
          <button
            type="button"
            disabled={processing}
            onClick={() => onReply('refuser')}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            <AppIcon name="XCircle" className="h-4 w-4" />
            {t('partnerSupport.admin.reject')}
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={() => onReply('valider')}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            <AppIcon name="CheckCircle" className="h-4 w-4" />
            {processing ? t('common.saving') : t('partnerSupport.admin.approve')}
          </button>
          </>
        )}
      </div>
    </article>
  )
}

function SupportDetailModal({ soutien, language, decision, adminReply, processing, onReplyChange, onClose, onStartDecision, onSubmitDecision, t }) {
  const partnerName = `${soutien.partenairePrenom || ''} ${soutien.partenaireNom || ''}`.trim()
  const target = soutien.projetTitre || soutien.activiteTitre || t('partnerSupport.admin.unknownTarget')
  const pending = soutien.statutPaiement === 'EN_ATTENTE'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-orange-600">{t('partnerSupport.admin.detailTitle', { defaultValue: 'Fiche soutien partenaire' })}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{target}</h2>
            <p className="mt-1 text-sm text-slate-500">{partnerName || t('partnerSupport.admin.unknownPartner')} · {soutien.partenaireEmail}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <AppIcon name="XCircle" className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Meta label={t('partnerSupport.amount')} value={`${soutien.montant || 0} €`} />
          <Meta label={t('users.status')} value={supportStatusLabel(soutien.statutPaiement, t)} />
          <Meta label={t('partnerSupport.date')} value={soutien.dateCreation ? new Date(soutien.dateCreation).toLocaleDateString(language || 'fr-BE') : '—'} />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('partnerSupport.admin.exchangeHistory', { defaultValue: 'Historique des échanges' })}</p>
          <div className="mt-3 space-y-3">
            <ExchangeItem
              icon="Handshake"
              title={t('partnerSupport.admin.partnerProposal', { defaultValue: 'Proposition partenaire' })}
              date={soutien.dateCreation}
              text={soutien.message || t('partnerSupport.admin.noPartnerMessage', { defaultValue: 'Aucun message ajouté par le partenaire.' })}
              language={language}
            />
            {soutien.reponseAdmin ? (
              <ExchangeItem
                icon="Shield"
                title={t('partnerSupport.admin.adminReply', { defaultValue: 'Réponse admin' })}
                date={soutien.dateReponseAdmin || soutien.datePaiement}
                text={soutien.reponseAdmin}
                language={language}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-500">
                {t('partnerSupport.admin.noAdminReply', { defaultValue: 'Aucune réponse admin pour le moment.' })}
              </p>
            )}
          </div>
        </div>

        {pending && (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="font-black text-blue-950">{t('partnerSupport.admin.respondTitle', { defaultValue: 'Répondre au partenaire' })}</p>
            <textarea
              value={adminReply}
              onChange={event => onReplyChange(event.target.value)}
              rows={3}
              placeholder={t('partnerSupport.admin.responsePlaceholder', { defaultValue: 'Expliquez la décision, les prochaines étapes ou le motif du refus...' })}
              className="mt-3 w-full resize-none rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => onStartDecision('refuser')} className={`rounded-xl border px-3 py-2 text-sm font-black ${decision === 'refuser' ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                {t('partnerSupport.admin.reject')}
              </button>
              <button type="button" onClick={() => onStartDecision('valider')} className={`rounded-xl px-3 py-2 text-sm font-black ${decision === 'valider' ? 'bg-green-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
                {t('partnerSupport.admin.approve')}
              </button>
              <button
                type="button"
                disabled={!decision || processing}
                onClick={onSubmitDecision}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {processing ? t('common.saving') : t('common.send', { defaultValue: 'Envoyer' })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ExchangeItem({ icon, title, date, text, language }) {
  return (
    <div className="flex gap-3 rounded-xl bg-white px-3 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
        <AppIcon name={icon} className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        {date && <p className="text-xs font-semibold text-slate-400">{new Date(date).toLocaleDateString(language || 'fr-BE')}</p>}
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
      </div>
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}

function StatusTab({ active, icon, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
        active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
      }`}
    >
      <span className="flex items-center gap-2">
        <AppIcon name={icon} className="h-4 w-4" />
        <span className="text-sm font-black">{label}</span>
      </span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${active ? 'bg-white/20' : 'bg-white'}`}>{value}</span>
    </button>
  )
}

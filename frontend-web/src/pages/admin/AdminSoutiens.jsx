import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [soutiens, setSoutiens] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('ALL')

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

  const traiterSoutien = async (soutien, action) => {
    const confirmationKey = action === 'valider' ? 'confirmApprove' : 'confirmReject'
    if (!confirmSensitiveAction(t(`partnerSupport.admin.${confirmationKey}`, {
      name: `${soutien.partenairePrenom || ''} ${soutien.partenaireNom || ''}`.trim(),
    }))) return

    setProcessingId(soutien.id)
    setError('')
    setMessage('')
    try {
      const response = await api.patch(`/partenaire/admin/${soutien.id}/${action}`)
      setSoutiens(current => current.map(item => item.id === soutien.id ? response.data : item))
      setMessage(t(action === 'valider'
        ? 'partnerSupport.admin.approved'
        : 'partnerSupport.admin.rejected'))
    } catch (err) {
      setError(userFriendlyError(err, t('partnerSupport.admin.actionError')))
    } finally {
      setProcessingId(null)
    }
  }

  const displayedSupports = useMemo(
    () => filter === 'ALL'
      ? soutiens
      : soutiens.filter(soutien => soutien.statutPaiement === filter),
    [filter, soutiens],
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

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="Wallet" label={t('partnerSupport.admin.total')} value={stats.total} color="#2563eb" />
          <StatCard icon="Clock" label={t('partnerSupport.statuses.EN_ATTENTE')} value={stats.pending} color="#d97706" />
          <StatCard icon="CheckCircle" label={t('partnerSupport.statuses.PAYE')} value={stats.accepted} color="#16a34a" />
          <StatCard icon="XCircle" label={t('partnerSupport.statuses.REMBOURSE')} value={stats.rejected} color="#dc2626" />
        </div>

        {message && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && soutiens.length > 0 && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <SectionCard
          title={t('partnerSupport.admin.listTitle')}
          subtitle={t('partnerSupport.admin.listDescription')}
          action={(
            <select
              value={filter}
              onChange={event => setFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="ALL">{t('partnerSupport.admin.allStatuses')}</option>
              <option value="EN_ATTENTE">{t('partnerSupport.statuses.EN_ATTENTE')}</option>
              <option value="PAYE">{t('partnerSupport.statuses.PAYE')}</option>
              <option value="REMBOURSE">{t('partnerSupport.statuses.REMBOURSE')}</option>
            </select>
          )}
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
                  onApprove={() => traiterSoutien(soutien, 'valider')}
                  onReject={() => traiterSoutien(soutien, 'refuser')}
                  t={t}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </main>
      <Footer />
    </div>
  )
}

function SupportCard({ soutien, language, processing, onApprove, onReject, t }) {
  const partnerName = `${soutien.partenairePrenom || ''} ${soutien.partenaireNom || ''}`.trim()
  const target = soutien.projetTitre || soutien.activiteTitre || t('partnerSupport.admin.unknownTarget')
  const targetType = soutien.projetTitre
    ? t('partnerSupport.project')
    : t('partnerSupport.activity')
  const pending = soutien.statutPaiement === 'EN_ATTENTE'

  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-md">
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

      {pending && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={processing}
            onClick={onReject}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            <AppIcon name="XCircle" className="h-4 w-4" />
            {t('partnerSupport.admin.reject')}
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={onApprove}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            <AppIcon name="CheckCircle" className="h-4 w-4" />
            {processing ? t('common.saving') : t('partnerSupport.admin.approve')}
          </button>
        </div>
      )}
    </article>
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

function StatCard({ icon, label, value, color }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-black" style={{ color }}>{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50" style={{ color }}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

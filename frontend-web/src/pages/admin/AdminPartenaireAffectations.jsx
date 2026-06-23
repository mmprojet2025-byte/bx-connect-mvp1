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

const emptyReferentForm = {
  partenaireProfilId: '',
  referentId: '',
  commentaire: '',
}

const emptyGroupeForm = {
  partenaireProfilId: '',
  groupeId: '',
  typeLien: 'AUTRE',
  commentaire: '',
}

const LINK_TYPES = ['SOUTIEN', 'MENTORAT', 'FORMATION', 'EMPLOI', 'LOGISTIQUE', 'AUTRE']

export default function AdminPartenaireAffectations() {
  const { t, i18n } = useTranslation()
  const [affectations, setAffectations] = useState({ referents: [], groupes: [] })
  const [partenaires, setPartenaires] = useState([])
  const [referents, setReferents] = useState([])
  const [groupes, setGroupes] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionKey, setActionKey] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [referentForm, setReferentForm] = useState(emptyReferentForm)
  const [groupeForm, setGroupeForm] = useState(emptyGroupeForm)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [affectationsRes, partenairesRes, referentsRes, groupesRes] = await Promise.all([
        api.get('/admin/partenaires/affectations'),
        api.get('/partenaire/publics'),
        api.get('/admin/referents'),
        api.get('/admin/groupes'),
      ])
      setAffectations(normalizeAssignments(affectationsRes.data))
      setPartenaires(Array.isArray(partenairesRes.data) ? partenairesRes.data : [])
      setReferents(Array.isArray(referentsRes.data) ? referentsRes.data : [])
      setGroupes(Array.isArray(groupesRes.data) ? groupesRes.data : [])
    } catch (err) {
      setError(userFriendlyError(err, t('partnerAssignments.errors.load')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchData() }, [fetchData])

  const stats = useMemo(() => ({
    total: affectations.referents.length + affectations.groupes.length,
    active: [...affectations.referents, ...affectations.groupes].filter(item => item.statut === 'ACTIF').length,
    referents: affectations.referents.length,
    groupes: affectations.groupes.length,
  }), [affectations])

  const submitReferent = async (event) => {
    event.preventDefault()
    if (!referentForm.partenaireProfilId || !referentForm.referentId) return
    setActionKey('create-referent')
    setError('')
    setMessage('')
    try {
      await api.post(
        `/admin/partenaires/${referentForm.partenaireProfilId}/referents/${referentForm.referentId}`,
        payloadFromForm(referentForm),
      )
      setReferentForm(emptyReferentForm)
      setMessage(t('partnerAssignments.messages.referentCreated'))
      await fetchData()
    } catch (err) {
      setError(userFriendlyError(err, t('partnerAssignments.errors.create')))
    } finally {
      setActionKey('')
    }
  }

  const submitGroupe = async (event) => {
    event.preventDefault()
    if (!groupeForm.partenaireProfilId || !groupeForm.groupeId) return
    setActionKey('create-groupe')
    setError('')
    setMessage('')
    try {
      await api.post(
        `/admin/partenaires/${groupeForm.partenaireProfilId}/groupes/${groupeForm.groupeId}`,
        payloadFromForm(groupeForm),
      )
      setGroupeForm(emptyGroupeForm)
      setMessage(t('partnerAssignments.messages.groupCreated'))
      await fetchData()
    } catch (err) {
      setError(userFriendlyError(err, t('partnerAssignments.errors.create')))
    } finally {
      setActionKey('')
    }
  }

  const deactivate = async (type, id) => {
    const key = `${type}-${id}`
    setActionKey(key)
    setError('')
    setMessage('')
    try {
      await api.patch(`/admin/partenaires/${type}/${id}/desactiver`)
      setMessage(t('partnerAssignments.messages.deactivated'))
      await fetchData()
    } catch (err) {
      setError(userFriendlyError(err, t('partnerAssignments.errors.deactivate')))
    } finally {
      setActionKey('')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <PageHeader
          eyebrow={t('partnerAssignments.eyebrow')}
          title={t('partnerAssignments.title')}
          description={t('partnerAssignments.description')}
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon="Handshake" label={t('partnerAssignments.kpis.total')} value={stats.total} />
          <Kpi icon="CheckCircle" label={t('partnerAssignments.kpis.active')} value={stats.active} tone="green" />
          <Kpi icon="User" label={t('partnerAssignments.kpis.referents')} value={stats.referents} tone="blue" />
          <Kpi icon="Users" label={t('partnerAssignments.kpis.groups')} value={stats.groupes} tone="amber" />
        </div>

        {message && <Alert>{message}</Alert>}
        {error && !loading && <Alert type="error">{error}</Alert>}

        {loading ? (
          <LoadingState label={t('partnerAssignments.loading')} />
        ) : error && affectations.referents.length === 0 && affectations.groupes.length === 0 ? (
          <ErrorState
            title={t('partnerAssignments.errors.title')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchData}
          />
        ) : (
          <>
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <AssignmentForm
                title={t('partnerAssignments.forms.referentTitle')}
                description={t('partnerAssignments.forms.referentDescription')}
                onSubmit={submitReferent}
                disabled={actionKey === 'create-referent'}
                submitLabel={t('partnerAssignments.assignToReferent')}
              >
                <SelectField
                  label={t('partnerAssignments.partner')}
                  value={referentForm.partenaireProfilId}
                  onChange={value => setReferentForm({ ...referentForm, partenaireProfilId: value })}
                  required
                >
                  <option value="">{t('partnerAssignments.placeholders.partner')}</option>
                  {partenaires.map(partenaire => (
                    <option key={partenaire.id} value={partenaire.id}>
                      {partenaire.nomOrganisation}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label={t('partnerAssignments.referent')}
                  value={referentForm.referentId}
                  onChange={value => setReferentForm({ ...referentForm, referentId: value })}
                  required
                >
                  <option value="">{t('partnerAssignments.placeholders.referent')}</option>
                  {referents.map(referent => (
                    <option key={referent.id} value={referent.id}>
                      {displayUser(referent)}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label={t('partnerAssignments.comment')}
                  value={referentForm.commentaire}
                  onChange={value => setReferentForm({ ...referentForm, commentaire: value })}
                />
              </AssignmentForm>

              <AssignmentForm
                title={t('partnerAssignments.forms.groupTitle')}
                description={t('partnerAssignments.forms.groupDescription')}
                onSubmit={submitGroupe}
                disabled={actionKey === 'create-groupe'}
                submitLabel={t('partnerAssignments.assignToGroup')}
              >
                <SelectField
                  label={t('partnerAssignments.partner')}
                  value={groupeForm.partenaireProfilId}
                  onChange={value => setGroupeForm({ ...groupeForm, partenaireProfilId: value })}
                  required
                >
                  <option value="">{t('partnerAssignments.placeholders.partner')}</option>
                  {partenaires.map(partenaire => (
                    <option key={partenaire.id} value={partenaire.id}>
                      {partenaire.nomOrganisation}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label={t('partnerAssignments.group')}
                  value={groupeForm.groupeId}
                  onChange={value => setGroupeForm({ ...groupeForm, groupeId: value })}
                  required
                >
                  <option value="">{t('partnerAssignments.placeholders.group')}</option>
                  {groupes.map(groupe => (
                    <option key={groupe.id} value={groupe.id}>
                      {groupe.nom}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label={t('partnerAssignments.linkType')}
                  value={groupeForm.typeLien}
                  onChange={value => setGroupeForm({ ...groupeForm, typeLien: value })}
                >
                  {LINK_TYPES.map(type => (
                    <option key={type} value={type}>
                      {t(`partnerAssignments.linkTypes.${type}`)}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label={t('partnerAssignments.comment')}
                  value={groupeForm.commentaire}
                  onChange={value => setGroupeForm({ ...groupeForm, commentaire: value })}
                />
              </AssignmentForm>
            </div>

            {partenaires.length === 0 && (
              <div className="mb-6">
                <EmptyState
                  icon="Handshake"
                  title={t('partnerAssignments.emptyPartners.title')}
                  description={t('partnerAssignments.emptyPartners.description')}
                />
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <AssignmentsList
                title={t('partnerAssignments.lists.referentsTitle')}
                subtitle={t('partnerAssignments.lists.referentsSubtitle')}
                emptyTitle={t('partnerAssignments.empty.referents')}
                items={affectations.referents}
                type="referents"
                actionKey={actionKey}
                onDeactivate={deactivate}
                t={t}
                language={i18n.language}
              />
              <AssignmentsList
                title={t('partnerAssignments.lists.groupsTitle')}
                subtitle={t('partnerAssignments.lists.groupsSubtitle')}
                emptyTitle={t('partnerAssignments.empty.groups')}
                items={affectations.groupes}
                type="groupes"
                actionKey={actionKey}
                onDeactivate={deactivate}
                t={t}
                language={i18n.language}
              />
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

function normalizeAssignments(data) {
  return {
    referents: Array.isArray(data?.referents) ? data.referents : [],
    groupes: Array.isArray(data?.groupes) ? data.groupes : [],
  }
}

function payloadFromForm(form) {
  return {
    commentaire: form.commentaire?.trim() || null,
    typeLien: form.typeLien || undefined,
  }
}

function displayUser(user) {
  return `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email
}

function formatDate(value, language) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(language || 'fr-BE')
}

function Kpi({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-sky-50 text-sky-700',
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

function AssignmentForm({ title, description, children, onSubmit, disabled, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3">
        {children}
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <AppIcon name="PlusCircle" className="h-4 w-4" />
        {submitLabel}
      </button>
    </form>
  )
}

function SelectField({ label, value, onChange, children, required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        required={required}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {children}
      </select>
    </label>
  )
}

function TextField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <textarea
        value={value}
        rows={3}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  )
}

function AssignmentsList({ title, subtitle, emptyTitle, items, type, actionKey, onDeactivate, t, language }) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {items.length === 0 ? (
        <EmptyState icon="Handshake" title={emptyTitle} />
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <article key={`${type}-${item.id}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{item.nomOrganisation}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {type === 'referents'
                      ? `${t('partnerAssignments.referent')}: ${[item.referentPrenom, item.referentNom].filter(Boolean).join(' ') || item.referentEmail || '—'}`
                      : `${t('partnerAssignments.group')}: ${item.groupeNom || '—'}`}
                  </p>
                </div>
                <StatusPill status={item.statut} t={t} />
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                {type === 'groupes' && (
                  <span>{t('partnerAssignments.linkType')}: {t(`partnerAssignments.linkTypes.${item.typeLien || 'AUTRE'}`)}</span>
                )}
                <span>{t('partnerAssignments.startedAt')}: {formatDate(item.dateDebut || item.createdAt, language)}</span>
                {item.commentaire && <span className="sm:col-span-2">{t('partnerAssignments.comment')}: {item.commentaire}</span>}
              </div>
              {item.statut === 'ACTIF' && (
                <button
                  type="button"
                  disabled={actionKey === `${type}-${item.id}`}
                  onClick={() => onDeactivate(type, item.id)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AppIcon name="XCircle" className="h-4 w-4" />
                  {t('partnerAssignments.deactivate')}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function StatusPill({ status, t }) {
  const active = status === 'ACTIF'
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
      {active ? t('partnerAssignments.active') : t('partnerAssignments.inactive')}
    </span>
  )
}

function Alert({ children, type = 'success' }) {
  const styles = type === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${styles}`}>
      {children}
    </div>
  )
}

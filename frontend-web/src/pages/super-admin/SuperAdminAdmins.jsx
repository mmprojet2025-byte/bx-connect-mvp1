import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError'
import AppIcon from '../../components/ui/AppIcons'
import SectionCard from '../../components/ui/SectionCard'

const emptyForm = {
  prenom: '',
  nom: '',
  email: '',
  motDePasseTemporaire: '',
}

async function fetchAdmins({ t, setAdmins, setError, setLoading }) {
  try {
    const res = await api.get('/super-admin/admins')
    setAdmins(res.data)
  } catch {
    setError(t('superAdmin.errorAdminsLoad'))
  } finally {
    setLoading(false)
  }
}

export default function SuperAdminAdmins() {
  const { t, i18n } = useTranslation()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    fetchAdmins({ t, setAdmins, setError, setLoading })
  }, [t])

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const createAdmin = async (e) => {
    e.preventDefault()
    clearFeedback()
    setSaving(true)
    try {
      const res = await api.post('/super-admin/admins', form)
      setAdmins(prev => [...prev, res.data])
      setForm(emptyForm)
      setMessage(t('superAdmin.adminCreated'))
    } catch (err) {
      setError(formatCreationError(err, t, t('superAdmin.errorAdminCreate')))
    } finally {
      setSaving(false)
    }
  }

  const disableAdmin = async (admin) => {
    if (!confirmSensitiveAction(t('superAdmin.confirmDisableAdmin', { email: admin.email }))) return
    clearFeedback()
    try {
      const res = await api.patch(`/super-admin/admins/${admin.id}/disable`)
      setAdmins(prev => prev.map(item => item.id === admin.id ? res.data : item))
      setMessage(t('superAdmin.adminDisabled'))
    } catch (err) {
      setError(userFriendlyError(err, t('superAdmin.errorDisableAdmin')))
    }
  }

  const enableAdmin = async (admin) => {
    clearFeedback()
    try {
      const res = await api.patch(`/super-admin/admins/${admin.id}/enable`)
      setAdmins(prev => prev.map(item => item.id === admin.id ? res.data : item))
      setMessage(t('superAdmin.adminEnabled'))
    } catch (err) {
      setError(userFriendlyError(err, t('superAdmin.errorEnableAdmin')))
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    if (!resetTarget) return
    if (!confirmSensitiveAction(t('superAdmin.confirmResetPassword', { email: resetTarget.email }))) return
    clearFeedback()
    try {
      await api.patch(`/super-admin/admins/${resetTarget.id}/reset-password`, {
        nouveauMotDePasseTemporaire: newPassword,
      })
      setMessage(t('superAdmin.passwordReset', { email: resetTarget.email }))
      setResetTarget(null)
      setNewPassword('')
    } catch (err) {
      setError(userFriendlyError(err, t('superAdmin.errorResetPassword')))
    }
  }

  const adminsFiltres = admins.filter(admin => {
    const texte = `${admin.prenom || ''} ${admin.nom || ''} ${admin.email || ''}`.toLowerCase()
    return texte.includes(recherche.toLowerCase())
  })
  const stats = {
    total: admins.length,
    actifs: admins.filter(admin => admin.actif).length,
    inactifs: admins.filter(admin => !admin.actif).length,
  }

  return (
    <SuperAdminLayout
      title={t('superAdmin.adminManagementTitle')}
      subtitle={t('superAdmin.adminManagementSubtitle')}
    >
      {message && <Alert>{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="Shield" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
        <StatCard icon="CheckCircle" label={t('superAdmin.activeAdmins')} value={stats.actifs} tone="green" />
        <StatCard icon="Clock" label={t('superAdmin.inactiveAdmins')} value={stats.inactifs} tone="amber" />
      </div>

      <form onSubmit={createAdmin} className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-blue-900 mb-4">{t('superAdmin.createAdmin')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label={t('users.firstname')} value={form.prenom} onChange={value => setForm({ ...form, prenom: value })} />
          <Input label={t('users.lastname')} value={form.nom} onChange={value => setForm({ ...form, nom: value })} />
          <Input label={t('users.email')} type="email" value={form.email} onChange={value => setForm({ ...form, email: value })} />
          <Input
            label={t('users.temporaryPassword')}
            type="password"
            value={form.motDePasseTemporaire}
            onChange={value => setForm({ ...form, motDePasseTemporaire: value })}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          <AppIcon name="PlusCircle" className="h-4 w-4" />
          {saving ? t('common.creating') : t('superAdmin.createAdminButton')}
        </button>
      </form>

      <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
        <label className="relative block">
          <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder={t('common.search', { defaultValue: 'Rechercher' })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>
      </SectionCard>

      {loading ? (
        <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
      ) : (
        <>
          <div className="md:hidden space-y-4">
            {adminsFiltres.length === 0 ? (
              <ModernEmpty icon="Shield" title={t('superAdmin.noAdmin')} />
            ) : adminsFiltres.map(admin => (
              <article key={admin.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-blue-900 text-sm truncate">{admin.prenom} {admin.nom}</h2>
                    <p className="text-xs text-gray-500 break-all mt-1">{admin.email}</p>
                  </div>
                  <StatusBadge actif={admin.actif} t={t} />
                </div>

                <div className="flex justify-between gap-4 text-xs mb-4">
                  <span className="text-gray-400">{t('users.registration')}</span>
                  <span className="font-medium text-gray-700 text-right">{formatDate(admin.dateInscription, i18n.language)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {admin.actif ? (
                    <button
                      onClick={() => disableAdmin(admin)}
                      disabled={stats.actifs <= 1}
                      title={stats.actifs <= 1 ? t('superAdmin.lastAdminActiveHint') : undefined}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-100 px-3 py-2 text-xs font-medium text-yellow-700 transition hover:bg-yellow-200"
                    >
                      <AppIcon name="Clock" className="h-3.5 w-3.5" />
                      {t('common.deactivate')}
                    </button>
                  ) : (
                    <button
                      onClick={() => enableAdmin(admin)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-green-100 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-200"
                    >
                      <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
                      {t('common.reactivate')}
                    </button>
                  )}
                  <button
                    onClick={() => { setResetTarget(admin); setNewPassword(''); clearFeedback() }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                  >
                    <AppIcon name="Lock" className="h-3.5 w-3.5" />
                    {t('superAdmin.resetPassword')}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: '760px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.name')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.email')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.status')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.registration')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {adminsFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">{t('superAdmin.noAdmin')}</td>
                  </tr>
                ) : adminsFiltres.map((admin, index) => (
                  <tr key={admin.id} className={`border-b border-gray-50 transition hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 font-medium text-blue-900 text-sm">{admin.prenom} {admin.nom}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{admin.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge actif={admin.actif} t={t} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(admin.dateInscription, i18n.language)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {admin.actif ? (
                          <button
                            onClick={() => disableAdmin(admin)}
                            disabled={stats.actifs <= 1}
                            title={stats.actifs <= 1 ? t('superAdmin.lastAdminActiveHint') : undefined}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 transition hover:bg-yellow-200"
                          >
                            <AppIcon name="Clock" className="h-3.5 w-3.5" />
                            {t('common.deactivate')}
                          </button>
                        ) : (
                          <button
                            onClick={() => enableAdmin(admin)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-200"
                          >
                            <AppIcon name="CheckCircle" className="h-3.5 w-3.5" />
                            {t('common.reactivate')}
                          </button>
                        )}
                        <button
                          onClick={() => { setResetTarget(admin); setNewPassword(''); clearFeedback() }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                        >
                          <AppIcon name="Lock" className="h-3.5 w-3.5" />
                          {t('superAdmin.resetPassword')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <form onSubmit={resetPassword} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-blue-900 mb-1">{t('superAdmin.resetPassword')}</h2>
            <p className="text-sm text-gray-500 mb-4">{resetTarget.email}</p>
            <Input
              label={t('superAdmin.newTemporaryPassword')}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => { setResetTarget(null); setNewPassword('') }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-900 text-white hover:bg-blue-800 transition"
              >
                {t('common.reset')}
              </button>
            </div>
          </form>
        </div>
      )}
    </SuperAdminLayout>
  )
}

function formatCreationError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired')
  if (err.response?.status === 403) return t('superAdmin.reservedAction')
  if (err.response?.status === 400 || err.response?.status === 422) {
    const data = err.response?.data || {}
    const fields = data.fields || {}
    const fieldMessages = Object.entries(fields)
      .map(([field, message]) => formatFieldError(field, message, t))
      .filter(Boolean)

    if (fieldMessages.length > 0) return fieldMessages.join(' ')

    const message = data.message || ''
    if (message.toLowerCase().includes('email')) return t('users.errorEmail')
    if (message.toLowerCase().includes('mot') || message.toLowerCase().includes('password')) {
      return t('users.errorTemporaryPassword')
    }
    return message || t('users.checkFields')
  }
  return userFriendlyError(err, fallback)
}

function formatFieldError(field, message, t) {
  if (field === 'motDePasseTemporaire' || field === 'nouveauMotDePasseTemporaire') {
    return t('users.errorTemporaryPassword')
  }
  if (field === 'email') {
    return message?.toLowerCase().includes('blank')
      ? t('users.emailRequired')
      : t('users.errorEmail')
  }
  if (['prenom', 'nom'].includes(field)) {
    return t(field === 'prenom' ? 'users.firstnameRequired' : 'users.lastnameRequired')
  }
  return message || null
}

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  }
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}

function ModernEmpty({ icon, title }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-gray-400 shadow-sm">
      <AppIcon name={icon} className="mx-auto mb-3 h-10 w-10 text-blue-300" />
      <p className="text-sm">{title}</p>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  )
}

function StatusBadge({ actif, t }) {
  const className = actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`text-xs px-3 py-0.5 rounded-full font-medium ${className}`}>
      {actif ? t('common.active') : t('common.inactive')}
    </span>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}

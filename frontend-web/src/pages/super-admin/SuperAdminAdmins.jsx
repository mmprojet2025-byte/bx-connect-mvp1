import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError'

const emptyForm = {
  prenom: '',
  nom: '',
  email: '',
  motDePasseTemporaire: '',
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

  useEffect(() => { fetchAdmins() }, [])

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/super-admin/admins')
      setAdmins(res.data)
    } catch {
      setError(t('superAdmin.errorAdminsLoad'))
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <SuperAdminLayout
      title={t('superAdmin.adminManagementTitle')}
      subtitle={t('superAdmin.adminManagementSubtitle')}
    >
      {message && <Alert>{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={createAdmin} className="bg-white rounded-2xl shadow p-5 mb-6">
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
          className="mt-4 bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition"
        >
          {saving ? t('common.creating') : t('superAdmin.createAdminButton')}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
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
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">{t('superAdmin.noAdmin')}</td>
                  </tr>
                ) : admins.map((admin, index) => (
                  <tr key={admin.id} className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
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
                            className="text-xs px-3 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium transition"
                          >
                            {t('common.deactivate')}
                          </button>
                        ) : (
                          <button
                            onClick={() => enableAdmin(admin)}
                            className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition"
                          >
                            {t('common.reactivate')}
                          </button>
                        )}
                        <button
                          onClick={() => { setResetTarget(admin); setNewPassword(''); clearFeedback() }}
                          className="text-xs px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition"
                        >
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

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'

export default function SuperAdminLogs() {
  const { t, i18n } = useTranslation()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/super-admin/logs')
      .then(res => setLogs(res.data))
      .catch(() => setError(t('superAdmin.errorLogsLoad')))
      .finally(() => setLoading(false))
  }, [t])

  return (
    <SuperAdminLayout
      title={t('superAdmin.logsTitle')}
      subtitle={t('superAdmin.logsSubtitle')}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.date')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.action')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.actor')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.target')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.details')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">{t('audit.noCriticalLog')}</td>
                  </tr>
                ) : logs.map((log, index) => (
                  <tr key={log.id} className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(log.dateAction, i18n.language)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-lg bg-blue-100 text-blue-800 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-blue-900">{log.acteurEmail}</div>
                      <div className="text-xs text-gray-400">{log.acteurRole}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.cibleEmail || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleString(language) : '-'
}

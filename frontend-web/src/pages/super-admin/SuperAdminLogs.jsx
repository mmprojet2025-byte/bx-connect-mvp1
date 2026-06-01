import { useEffect, useState } from 'react'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'

export default function SuperAdminLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/super-admin/logs')
      .then(res => setLogs(res.data))
      .catch(() => setError('Impossible de charger les logs.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SuperAdminLayout
      title="Logs critiques"
      subtitle="Journal des actions sensibles réalisées sur la plateforme."
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-10">Chargement...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acteur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cible</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Aucun log critique.</td>
                  </tr>
                ) : logs.map((log, index) => (
                  <tr key={log.id} className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(log.dateAction)}</td>
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

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-BE') : '-'
}

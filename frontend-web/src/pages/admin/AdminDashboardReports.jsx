import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { canExportAdminReport } from './adminDashboardReport.js'

export default function AdminDashboardReports({ model, projects, activities, loading }) {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const available = !loading && canExportAdminReport(model, projects, activities)
  const download = async format => {
    if (!available || busy) return
    setBusy(true)
    setError('')
    try {
      const { buildAdminReport, adminReportPdf, downloadAdminReportCsv } = await import('./adminDashboardReport.js')
      const report = buildAdminReport({ model, projects, activities, t, language: i18n.resolvedLanguage || i18n.language })
      const filename = `bx-connect-${report.generatedAt.replace(/[:.]/g, '-')}.${format}`
      if (format === 'pdf') adminReportPdf(report, t).save(filename)
      else downloadAdminReportCsv(report, t, filename)
    } catch {
      setError(t('admin.dashboardReports.error'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-labelledby="admin-reports-title" className="mt-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 id="admin-reports-title" className="text-base font-black text-slate-950">{t('admin.dashboardReports.title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('admin.dashboardReports.description')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {['pdf', 'csv'].map(format => <button key={format} type="button" disabled={!available || busy} onClick={() => download(format)}
          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
          {t(`admin.dashboardReports.${format}`)}
        </button>)}
      </div>
      {!available && <p className="mt-2 text-sm text-amber-800">{loading ? t('admin.loading') : t('admin.dashboardReports.unavailable')}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  )
}

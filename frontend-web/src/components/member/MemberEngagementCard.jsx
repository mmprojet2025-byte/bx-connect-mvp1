import { useTranslation } from 'react-i18next'

export default function MemberEngagementCard({ implication }) {
  const { t } = useTranslation()
  const data = implication || {
    statut: 'NOUVEAU_MEMBRE',
  }
  const label = t(`memberDashboard.statuses.engagement.${data.statut}`, {
    defaultValue: t('memberDashboard.statuses.engagement.NOUVEAU_MEMBRE'),
  })
  const description = t(`memberDashboard.engagement.descriptions.${data.statut}`, {
    defaultValue: t('memberDashboard.engagement.descriptions.default'),
  })

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold text-blue-900 mb-4">{t('memberDashboard.engagement.title')}</h2>
      <div className="bg-teal-50 text-teal-800 rounded-xl px-4 py-3 text-sm font-semibold">
        {t('memberDashboard.engagement.statusLine', { status: label })}
      </div>
      <p className="text-sm text-gray-500 mt-4">{description}</p>
    </section>
  )
}

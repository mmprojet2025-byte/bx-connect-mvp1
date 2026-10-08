import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import ProjectPayments from '../../components/projects/ProjectPayments'
export default function MesFactures() {
  const { t } = useTranslation()
  return <><Navbar /><main className="mx-auto max-w-4xl p-5">
    <h1 className="text-2xl font-bold">{t('projectPayment.invoiceTitle')}</h1>
    <p className="mt-2 text-slate-600">{t('projectPayment.invoiceHelp')}</p>
    <ProjectPayments />
  </main></>
}

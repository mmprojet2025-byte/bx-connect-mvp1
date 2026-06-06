import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import AppIcon from '../../components/ui/AppIcons'
import { LEGAL_VERSION } from '../../constants/legal'

const ICONS = {
  terms: 'Shield',
  privacy: 'Lock',
  notices: 'Building',
}

export default function LegalPage({ document }) {
  const { t } = useTranslation()
  const sections = t(`legal.documents.${document}.sections`, { returnObjects: true })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-10">
        <header className="rounded-3xl bg-gradient-to-br from-blue-900 to-blue-600 px-6 py-8 text-white shadow-lg">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <AppIcon name={ICONS[document]} className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-blue-100">{t('legal.eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-black">{t(`legal.documents.${document}.title`)}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
            {t(`legal.documents.${document}.intro`)}
          </p>
          <span className="mt-5 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            {LEGAL_VERSION}
          </span>
        </header>

        <div className="mt-6 space-y-4">
          {Array.isArray(sections) && sections.map((section, index) => (
            <section key={`${section.title}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">{section.title}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/conditions-utilisation" className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800">
            {t('legal.links.terms')}
          </Link>
          <Link to="/politique-confidentialite" className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800">
            {t('legal.links.privacy')}
          </Link>
          <Link to="/mentions-legales" className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800">
            {t('legal.links.notices')}
          </Link>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">{t('legal.validationNotice')}</p>
      </main>
      <Footer />
    </div>
  )
}

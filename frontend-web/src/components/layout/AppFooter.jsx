import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function AppFooter() {
  const { t } = useTranslation()

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50/90 px-4 py-2 text-xs text-slate-500">
      <div className="mx-auto flex min-h-8 max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-slate-600">© 2026 BX-Connect</span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span>Version Alpha 1.0</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Liens applicatifs">
          <Link to="/conditions-utilisation" className="transition hover:text-blue-700">
            {t('legal.links.terms')}
          </Link>
          <Link to="/politique-confidentialite" className="transition hover:text-blue-700">
            Confidentialité
          </Link>
        </nav>
      </div>
    </footer>
  )
}

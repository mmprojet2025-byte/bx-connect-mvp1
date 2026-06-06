import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-blue-900 text-white text-center py-5 mt-auto text-sm">
      <p>© 2026 BX-CONNECT — Plateforme numérique Bx-Jeunes Impact ASBL</p>
      <nav className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-blue-200">
        <Link to="/conditions-utilisation" className="hover:text-white">{t('legal.links.terms')}</Link>
        <Link to="/politique-confidentialite" className="hover:text-white">{t('legal.links.privacy')}</Link>
        <Link to="/mentions-legales" className="hover:text-white">{t('legal.links.notices')}</Link>
      </nav>
    </footer>
  )
}

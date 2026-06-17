import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import AppFooter from './layout/AppFooter'
import logoBxConnect from '../assets/images/logo-bx-connect.png'

export default function Footer() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) return <AppFooter />

  return (
    <footer className="mt-auto bg-blue-950 px-5 py-12 text-sm text-white">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr] lg:px-8">
        <div>
          <Link to="/" className="inline-flex">
            <img
              src={logoBxConnect}
              alt="BX-CONNECT"
              className="w-[210px] max-w-full rounded bg-white/95 px-3 py-2 object-contain"
            />
          </Link>
          <p className="mt-5 max-w-sm leading-6 text-blue-100">
            La plateforme qui connecte les jeunes, les associations et les projets à Bruxelles.
          </p>
        </div>

        <FooterColumn
          title="Plateforme"
          links={[
            { to: '/activites', label: 'Activités' },
            { to: '/groupes', label: 'Groupes' },
            { to: '/projets', label: 'Projets' },
          ]}
        />

        <FooterColumn
          title="Compte"
          links={[
            { to: '/login', label: 'Connexion' },
            { to: '/register', label: 'Inscription' },
            { to: '/a-propos', label: 'À propos' },
          ]}
        />

        <div>
          <h2 className="font-bold text-white">Cadre légal</h2>
          <nav className="mt-4 grid gap-3 text-blue-200">
            <Link to="/conditions-utilisation" className="transition hover:text-white">{t('legal.links.terms')}</Link>
            <Link to="/politique-confidentialite" className="transition hover:text-white">{t('legal.links.privacy')}</Link>
            <Link to="/mentions-legales" className="transition hover:text-white">{t('legal.links.notices')}</Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-xs text-blue-200 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© 2026 BX-CONNECT — Plateforme numérique Bx-Jeunes Impact ASBL</p>
        <p>Connecter • Inspirer • Impacter</p>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h2 className="font-bold text-white">{title}</h2>
      <nav className="mt-4 grid gap-3 text-blue-200">
        {links.map(link => (
          <Link key={link.to} to={link.to} className="transition hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppIcon from '../components/ui/AppIcons'

const links = [
  { to: '/super-admin/dashboard', labelKey: 'nav.dashboard', icon: 'Dashboard' },
  { to: '/super-admin/admins', labelKey: 'nav.admins', icon: 'Shield' },
  { to: '/super-admin/logs', labelKey: 'nav.logs', icon: 'Folder' },
  { to: '/profil', labelKey: 'nav.profile', icon: 'User' },
]

export default function SuperAdminLayout({ children, title, subtitle }) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <aside className="h-fit rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-lg shadow-slate-900/5">
            <p className="mb-3 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">{t('nav.platform')}</p>
            <nav className="space-y-2">
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-bold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-900'
                    }`
                  }
                >
                  <AppIcon name={link.icon} className="h-4 w-4" />
                  <span>{t(link.labelKey)}</span>
                </NavLink>
              ))}
            </nav>
          </aside>

          <section>
            <div className="mb-6 rounded-[2rem] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-950/5">
              <p className="mb-2 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-600">BX-Connect</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
              {subtitle && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{subtitle}</p>}
            </div>
            {children}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

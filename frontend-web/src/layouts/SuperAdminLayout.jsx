import { NavLink } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const links = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/super-admin/admins', label: 'Administrateurs', icon: '🛡️' },
  { to: '/super-admin/logs', label: 'Logs', icon: '🧾' },
]

export default function SuperAdminLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <aside className="bg-white rounded-2xl shadow p-4 h-fit">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Plateforme</p>
            <nav className="space-y-2">
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-900 text-white'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-900'
                    }`
                  }
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>

          <section>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-blue-900">{title}</h1>
              {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
            </div>
            {children}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

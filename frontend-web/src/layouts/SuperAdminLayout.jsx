import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function SuperAdminLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 px-3 py-4 lg:px-5 lg:py-5">
        <section className="min-w-0">
          <div className="mb-6 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-950/5 sm:p-6">
            <p className="mb-2 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-600">BX-Connect</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </section>
      </main>

      <Footer />
    </div>
  )
}

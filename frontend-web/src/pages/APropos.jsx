import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AppIcon from '../components/ui/AppIcons';
import { useTranslation } from 'react-i18next';

export default function APropos() {
  const { t } = useTranslation();
  const values = [
    { icon: 'Handshake', title: t('about.values.solidarity.title'), desc: t('about.values.solidarity.desc') },
    { icon: 'Rocket', title: t('about.values.innovation.title'), desc: t('about.values.innovation.desc') },
    { icon: 'Globe', title: t('about.values.inclusion.title'), desc: t('about.values.inclusion.desc') },
  ];
  const features = [
    { icon: 'Folder', title: t('nav.activities'), desc: t('about.features.activities') },
    { icon: 'Rocket', title: t('nav.projects'), desc: t('about.features.projects') },
    { icon: 'Users', title: t('nav.groups'), desc: t('about.features.groups') },
    { icon: 'MessageCircle', title: t('nav.messaging'), desc: t('about.features.messaging') },
    { icon: 'Handshake', title: t('about.features.partnershipsTitle'), desc: t('about.features.partnerships') },
  ];
  const actors = [
    { role: t('about.actors.visitor.title'), icon: 'Eye', desc: t('about.actors.visitor.desc') },
    { role: t('about.actors.member.title'), icon: 'User', desc: t('about.actors.member.desc') },
    { role: t('about.actors.referent.title'), icon: 'User', desc: t('about.actors.referent.desc') },
    { role: t('about.actors.partner.title'), icon: 'Handshake', desc: t('about.actors.partner.desc') },
    { role: t('about.actors.admin.title'), icon: 'Shield', desc: t('about.actors.admin.desc') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        {/* Hero */}
        <div className="bg-blue-800 text-white rounded-2xl p-8 mb-8 text-center">
          <AppIcon name="Star" className="mx-auto mb-4 h-12 w-12 text-blue-200" />
          <h1 className="text-3xl font-bold mb-3">{t('about.title')}</h1>
          <p className="text-blue-200 text-base max-w-xl mx-auto">
            {t('about.subtitle')}
          </p>
        </div>

        {/* Mission */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4"><AppIcon name="Dashboard" className="h-5 w-5" />{t('about.missionTitle')}</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            {t('about.missionP1')}
          </p>
          <p className="text-gray-600 leading-relaxed">
            {t('about.missionP2')}
          </p>
        </div>

        {/* Valeurs */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4"><AppIcon name="Lightbulb" className="h-5 w-5" />{t('about.valuesTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {values.map(v => (
              <div key={v.title} className="bg-blue-50 rounded-xl p-4 text-center">
                <AppIcon name={v.icon} className="mx-auto mb-2 h-8 w-8 text-blue-700" />
                <h3 className="font-bold text-blue-900 mb-1">{v.title}</h3>
                <p className="text-gray-500 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ce que tu peux faire */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4"><AppIcon name="Star" className="h-5 w-5" />{t('home.features_title')}</h2>
          <div className="space-y-3">
            {features.map(item => (
              <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                <AppIcon name={item.icon} className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acteurs */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4"><AppIcon name="User" className="h-5 w-5" />{t('about.actorsTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actors.map(a => (
              <div key={a.role} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <AppIcon name={a.icon} className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="font-bold text-blue-900 text-sm">{a.role}</p>
                  <p className="text-gray-500 text-xs">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-blue-800 text-white rounded-2xl p-6 text-center">
          <h2 className="flex items-center justify-center gap-2 text-xl font-bold mb-2"><AppIcon name="Mail" className="h-5 w-5" />{t('about.contactTitle')}</h2>
          <p className="text-blue-200 text-sm mb-4">
            {t('about.contactDesc')}
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm"><AppIcon name="Mail" className="h-4 w-4" />contact@bxconnect.be</span>
            <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm"><AppIcon name="MapPin" className="h-4 w-4" />Bruxelles, Belgique</span>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}

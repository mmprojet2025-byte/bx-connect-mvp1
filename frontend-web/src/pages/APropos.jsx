import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AppIcon from '../components/ui/AppIcons';

export default function APropos() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        {/* Hero */}
        <div className="bg-blue-800 text-white rounded-2xl p-8 mb-8 text-center">
          <AppIcon name="Star" className="mx-auto mb-4 h-12 w-12 text-blue-200" />
          <h1 className="text-3xl font-bold mb-3">À propos de BX-CONNECT</h1>
          <p className="text-blue-200 text-base max-w-xl mx-auto">
            La plateforme numérique des jeunes et associations de Bruxelles,
            inspirée de Bx-Jeunes Impact.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4"><AppIcon name="Dashboard" className="h-5 w-5" />Notre mission</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            BX-CONNECT est une plateforme numérique développée pour connecter les jeunes
            et les associations actives à Bruxelles. Notre objectif est de faciliter
            l'accès aux activités sociales, éducatives et culturelles, tout en permettant
            aux membres de proposer et rejoindre des projets collaboratifs.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Inspirée du contexte réel de l'association <strong>Bx-Jeunes Impact</strong>,
            cette plateforme s'inscrit dans une démarche d'engagement citoyen et de
            développement communautaire pour les jeunes bruxellois.
          </p>
        </div>

        {/* Valeurs */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4"><AppIcon name="Lightbulb" className="h-5 w-5" />Nos valeurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: 'Handshake', titre: 'Solidarité', desc: 'Créer des liens entre les jeunes et les associations pour un impact collectif.' },
              { icon: 'Rocket', titre: 'Innovation', desc: 'Utiliser le numérique pour faciliter l\'accès aux opportunités pour tous.' },
              { icon: 'Globe', titre: 'Inclusion', desc: 'Une plateforme accessible en français, néerlandais et anglais pour tous.' },
            ].map(v => (
              <div key={v.titre} className="bg-blue-50 rounded-xl p-4 text-center">
                <AppIcon name={v.icon} className="mx-auto mb-2 h-8 w-8 text-blue-700" />
                <h3 className="font-bold text-blue-900 mb-1">{v.titre}</h3>
                <p className="text-gray-500 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ce que tu peux faire */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4"><AppIcon name="Star" className="h-5 w-5" />Ce que tu peux faire</h2>
          <div className="space-y-3">
            {[
              { icon: 'Folder', titre: 'Activités', desc: 'Découvrir, filtrer et s\'inscrire aux activités organisées par Bx-Jeunes Impact.' },
              { icon: 'Rocket', titre: 'Projets', desc: 'Proposer ou rejoindre des projets collaboratifs avec d\'autres membres.' },
              { icon: 'Users', titre: 'Groupes', desc: 'Rejoindre des groupes thématiques et échanger avec la communauté.' },
              { icon: 'MessageCircle', titre: 'Messagerie', desc: 'Communiquer avec les membres de ton groupe via des fils de discussion.' },
              { icon: 'Handshake', titre: 'Partenariats', desc: 'Les partenaires peuvent soutenir financièrement des projets et activités.' },
            ].map(item => (
              <div key={item.titre} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                <AppIcon name={item.icon} className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">{item.titre}</p>
                  <p className="text-gray-500 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acteurs */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4"><AppIcon name="User" className="h-5 w-5" />Les acteurs de la plateforme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { role: 'Visiteur',    icon: 'Eye',  desc: 'Consulte les activités et informations publiques sans inscription.' },
              { role: 'Membre',      icon: 'User',  desc: 'S\'inscrit aux activités, propose des projets, rejoint des groupes.' },
              { role: 'Référent',    icon: 'User',  desc: 'Gère les activités et projets de son groupe, valide les demandes.' },
              { role: 'Partenaire',  icon: 'Handshake',  desc: 'Soutient financièrement des projets et activités de l\'association.' },
              { role: 'Administrateur', icon: 'Shield', desc: 'Gère l\'ensemble de la plateforme, les utilisateurs et les contenus.' },
            ].map(a => (
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
          <h2 className="flex items-center justify-center gap-2 text-xl font-bold mb-2"><AppIcon name="Mail" className="h-5 w-5" />Contact</h2>
          <p className="text-blue-200 text-sm mb-4">
            Pour toute question ou partenariat, contactez l'équipe BX-CONNECT.
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

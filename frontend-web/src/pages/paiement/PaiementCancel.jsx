import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import AppIcon from '../../components/ui/AppIcons';

export default function PaiementCancel() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">

          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AppIcon name="XCircle" className="h-10 w-10 text-orange-600" />
          </div>

          <h1 className="text-2xl font-bold text-orange-600 mb-2">Paiement annulé</h1>
          <p className="text-gray-500 text-sm mb-6">
            Vous avez annulé le paiement. Aucun montant n'a été débité.
            Vous pouvez réessayer à tout moment.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              to="/activites"
              className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl transition text-sm"
            >
              <AppIcon name="Folder" className="h-4 w-4" />
              Voir les activités
            </Link>
            <Link
              to="/projets"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition text-sm"
            >
              <AppIcon name="Rocket" className="h-4 w-4" />
              Voir les projets
            </Link>
            <Link
              to="/dashboard"
              className="text-gray-400 hover:underline text-sm"
            >
              Retour au dashboard
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

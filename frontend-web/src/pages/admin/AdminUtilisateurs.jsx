import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';

const ROLES = ['MEMBRE', 'REFERENT', 'PARTENAIRE'];

export default function AdminUtilisateurs() {
  const { t, i18n } = useTranslation();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => { fetchUtilisateurs(); }, []);

  const fetchUtilisateurs = async () => {
    try {
      const res = await api.get('/admin/utilisateurs');
      setUtilisateurs(res.data);
    } catch (err) {
      setError(userFriendlyError(err, t('users.errorLoad')));
    } finally {
      setLoading(false);
    }
  };

  const changerRole = async (id, role) => {
    try {
      const res = await api.patch(`/admin/utilisateurs/${id}/role?role=${role}`);
      setUtilisateurs(prev => prev.map(u => u.id === id ? res.data : u));
      setMessage(t('users.roleUpdated'));
      setError('');
    } catch (err) {
      setError(userFriendlyError(err, t('users.errorRoleUpdate')));
    }
  };

  const toggleActif = async (user) => {
    if (user.actif && !confirmSensitiveAction(`Désactiver le compte de ${user.email} ?`)) return;
    try {
      const res = await api.patch(`/admin/utilisateurs/${user.id}/actif`);
      setUtilisateurs(prev => prev.map(u => u.id === user.id ? res.data : u));
      setMessage(t('users.statusUpdated'));
      setError('');
    } catch (err) {
      setError(userFriendlyError(err, t('users.errorStatusUpdate')));
    }
  };

  const supprimerUtilisateur = async (id, email) => {
    if (!confirmSensitiveAction(t('users.confirmDelete', { email }))) return;
    try {
      await api.delete(`/admin/utilisateurs/${id}`);
      setUtilisateurs(prev => prev.filter(u => u.id !== id));
      setMessage(t('users.deleted'));
      setError('');
    } catch (err) {
      setError(userFriendlyError(err, t('users.errorDelete')));
    }
  };

  const utilisateursFiltres = utilisateurs.filter(u =>
    u.prenom?.toLowerCase().includes(recherche.toLowerCase()) ||
    u.nom?.toLowerCase().includes(recherche.toLowerCase()) ||
    u.email?.toLowerCase().includes(recherche.toLowerCase())
  );

  const peutModifier = (user) => user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-blue-900 mb-1">👥 {t('admin.users_title')}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('users.registeredCount', { count: utilisateurs.length })}</p>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        <input
          type="text"
          placeholder={t('users.searchPlaceholder')}
          value={recherche}
          onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('admin.loading')}</p>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.name')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.email')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.role')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.status')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.registration')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisateursFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">{t('users.noneFound')}</td>
                    </tr>
                  ) : (
                    utilisateursFiltres.map((u, i) => (
                      <tr key={u.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-blue-900 text-sm">{u.prenom} {u.nom}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          {peutModifier(u) ? (
                            <select
                              value={u.role}
                              onChange={e => changerRole(u.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              style={{ background: roleColor(u.role), color: '#fff' }}
                            >
                              {ROLES.map(r => (
                                <option key={r} value={r} style={{ background: '#fff', color: '#333' }}>{t(`roles.${r}`, r)}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className="text-xs px-2 py-1 rounded-lg font-semibold text-white"
                              style={{ background: roleColor(u.role) }}
                            >
                              {t(`roles.${u.role}`, u.role)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-3 py-0.5 rounded-full font-medium ${u.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.actif ? t('common.active') : t('common.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {u.dateInscription ? new Date(u.dateInscription).toLocaleDateString(i18n.language) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {peutModifier(u) ? (
                              <>
                                <button
                                  onClick={() => toggleActif(u)}
                                  className={`text-xs px-3 py-1 rounded-lg font-medium transition ${u.actif ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                >
                                  {u.actif ? t('users.disable') : t('users.enable')}
                                </button>
                                <button
                                  onClick={() => supprimerUtilisateur(u.id, u.email)}
                                  className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition"
                                >
                                  {t('common.delete')}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">{t('users.readOnly')}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function roleColor(role) {
  switch (role) {
    case 'ADMIN':      return '#dc3545';
    case 'SUPER_ADMIN': return '#7c3aed';
    case 'REFERENT':   return '#17a2b8';
    case 'PARTENAIRE': return '#fd7e14';
    default:           return '#1A3C5E';
  }
}

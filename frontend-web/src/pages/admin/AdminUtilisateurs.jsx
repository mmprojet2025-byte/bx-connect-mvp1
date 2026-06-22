import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';
import AppIcon from '../../components/ui/AppIcons';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';

const ROLES = ['MEMBRE', 'REFERENT', 'PARTENAIRE'];

export default function AdminUtilisateurs({
  endpoint = '/admin/utilisateurs',
  readOnly = false,
  pageTitle,
  pageDescription,
}) {
  const { t, i18n } = useTranslation();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => { fetchUtilisateurs(); }, [endpoint]);

  const fetchUtilisateurs = async () => {
    try {
      const res = await api.get(endpoint);
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

  const peutModifier = (user) => !readOnly && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN';
  const stats = {
    total: utilisateurs.length,
    actifs: utilisateurs.filter(u => u.actif).length,
    referents: utilisateurs.filter(u => u.role === 'REFERENT').length,
    membres: utilisateurs.filter(u => u.role === 'MEMBRE').length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('admin.users_title')}
          title={pageTitle || t('admin.users_title')}
          description={pageDescription || t('users.registeredCount', { count: utilisateurs.length })}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon="Users" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
          <StatCard icon="CheckCircle" label={t('common.active')} value={stats.actifs} tone="green" />
          <StatCard icon="User" label={t('roles.REFERENT', { defaultValue: 'Référents' })} value={stats.referents} tone="teal" />
          <StatCard icon="Users" label={t('roles.MEMBRE', { defaultValue: 'Membres' })} value={stats.membres} tone="violet" />
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && utilisateurs.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <label className="relative block">
            <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('users.searchPlaceholder')}
              value={recherche}
              onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
        </SectionCard>

        {loading ? (
          <LoadingState label={t('admin.loading')} />
        ) : error && utilisateurs.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchUtilisateurs}
          />
        ) : utilisateurs.length === 0 ? (
          <EmptyState
            icon="Users"
            title={t('users.noneFound')}
          />
        ) : utilisateursFiltres.length === 0 ? (
          <EmptyState
            icon="Search"
            title={t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}
          />
        ) : (
          <>
            <div className="md:hidden space-y-4">
              {utilisateursFiltres.length === 0 ? (
                <ModernEmpty icon="Users" title={t('users.noneFound')} />
              ) : (
                utilisateursFiltres.map(u => (
                  <article key={u.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-blue-900 text-sm truncate">{u.prenom} {u.nom}</h2>
                        <p className="text-xs text-gray-500 break-all mt-1">{u.email}</p>
                      </div>
                      <span className={`shrink-0 text-xs px-3 py-0.5 rounded-full font-medium ${u.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.actif ? t('common.active') : t('common.inactive')}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">{t('users.role')}</p>
                        {peutModifier(u) ? (
                          <select
                            value={u.role}
                            onChange={e => changerRole(u.id, e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            style={{ background: roleColor(u.role), color: '#fff' }}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r} style={{ background: '#fff', color: '#333' }}>{t(`roles.${r}`, r)}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-white" style={{ background: roleColor(u.role) }}>
                            <AppIcon name={roleIcon(u.role)} className="h-3.5 w-3.5" />
                            {t(`roles.${u.role}`, u.role)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {peutModifier(u) ? (
                          <>
                            <button
                              onClick={() => toggleActif(u)}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${u.actif ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                              <AppIcon name={u.actif ? 'Clock' : 'CheckCircle'} className="h-3.5 w-3.5" />
                              {u.actif ? t('users.disable') : t('users.enable')}
                            </button>
                            <button
                              onClick={() => supprimerUtilisateur(u.id, u.email)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-200"
                            >
                              <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                              {t('common.delete')}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">{t('users.readOnly')}</span>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="hidden overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm md:block">
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
                      <tr key={u.id} className={`border-b border-gray-50 transition hover:bg-blue-50/50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
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
                              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-white"
                              style={{ background: roleColor(u.role) }}
                            >
                              <AppIcon name={roleIcon(u.role)} className="h-3.5 w-3.5" />
                              {t(`roles.${u.role}`, u.role)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.actif ? 'VALIDE' : 'ANNULEE'}>
                            {u.actif ? t('common.active') : t('common.inactive')}
                          </StatusBadge>
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
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${u.actif ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                >
                                  <AppIcon name={u.actif ? 'Clock' : 'CheckCircle'} className="h-3.5 w-3.5" />
                                  {u.actif ? t('users.disable') : t('users.enable')}
                                </button>
                                <button
                                  onClick={() => supprimerUtilisateur(u.id, u.email)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
                                >
                                  <AppIcon name="XCircle" className="h-3.5 w-3.5" />
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
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ModernEmpty({ icon, title }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-gray-400 shadow-sm">
      <AppIcon name={icon} className="mx-auto mb-3 h-10 w-10 text-blue-300" />
      <p className="text-sm">{title}</p>
    </div>
  );
}

function roleIcon(role) {
  switch (role) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return 'Shield';
    case 'REFERENT':
      return 'User';
    case 'PARTENAIRE':
      return 'Handshake';
    default:
      return 'Users';
  }
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

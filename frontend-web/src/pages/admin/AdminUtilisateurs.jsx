import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import { confirmSensitiveAction, userFriendlyError } from '../../utils/userFriendlyError';
import AppIcon from '../../components/ui/AppIcons';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';

const ROLES = ['MEMBRE', 'REFERENT', 'PARTENAIRE'];

async function fetchUtilisateurs({ endpoint, t, setUtilisateurs, setError, setLoading }) {
  try {
    const res = await api.get(endpoint);
    setUtilisateurs(res.data);
  } catch (err) {
    setError(userFriendlyError(err, t('users.errorLoad')));
  } finally {
    setLoading(false);
  }
}

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
  const [filtre, setFiltre] = useState('TOUS');

  useEffect(() => {
    fetchUtilisateurs({ endpoint, t, setUtilisateurs, setError, setLoading });
  }, [endpoint, t]);

  const changerRole = async (user, role) => {
    if (user.role === role) return;
    if (!canManageUser(user)) {
      setError(t('users.errorRoleForbidden'));
      return;
    }
    if (!confirmSensitiveAction(t('users.confirmRoleChange', {
      user: displayUserName(user),
      role: t(`roles.${role}`, { defaultValue: role }),
    }))) return;
    try {
      const res = await api.patch(`/admin/utilisateurs/${user.id}/role?role=${role}`);
      setUtilisateurs(prev => prev.map(u => u.id === user.id ? res.data : u));
      setMessage(t('users.roleUpdated'));
      setError('');
    } catch (err) {
      setError(err?.response?.status === 403
        ? t('users.errorRoleForbidden')
        : userFriendlyError(err, t('users.errorRoleUpdate')));
    }
  };

  const toggleActif = async (user) => {
    const confirmationKey = user.actif ? 'users.confirmDisable' : 'users.confirmEnable';
    if (!confirmSensitiveAction(t(confirmationKey, { email: user.email }))) return;
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

  const utilisateursFiltres = utilisateurs.filter(u => {
    const search = recherche.toLowerCase();
    const matchRecherche = u.prenom?.toLowerCase().includes(search) ||
      u.nom?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search);
    const matchFiltre = filtre === 'TOUS' ||
      (filtre === 'ACTIFS' && u.actif) ||
      (filtre === 'INACTIFS' && !u.actif) ||
      u.role === filtre;
    return matchRecherche && matchFiltre;
  });
  const filtres = [
    { id: 'TOUS', label: t('users.filters.all') },
    { id: 'ACTIFS', label: t('users.filters.active') },
    { id: 'INACTIFS', label: t('users.filters.inactive') },
    { id: 'MEMBRE', label: t('roles.MEMBRE') },
    { id: 'REFERENT', label: t('roles.REFERENT') },
    { id: 'PARTENAIRE', label: t('roles.PARTENAIRE') },
  ];

  const peutModifier = (user) => !readOnly && canManageUser(user);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-none px-2 py-3 sm:px-4">
        <header className="mb-2 flex flex-col gap-1 px-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="text-2xl font-black tracking-tight text-slate-950">{pageTitle || t('admin.users_title')}</h1>
          <p className="text-sm font-medium text-slate-500">
            {pageDescription || t('users.registeredCount', { count: utilisateurs.length })}
          </p>
        </header>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl mb-2 text-sm">{message}</div>
        )}
        {error && utilisateurs.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl mb-2 text-sm">{error}</div>
        )}

        <section className="mb-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block lg:w-80">
              <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('users.searchPlaceholder')}
                value={recherche}
                onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filtres.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltre(item.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                    filtre === item.id
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingState label={t('admin.loading')} />
        ) : error && utilisateurs.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={() => fetchUtilisateurs({ endpoint, t, setUtilisateurs, setError, setLoading })}
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
            <div className="md:hidden space-y-3">
              {utilisateursFiltres.length === 0 ? (
                <ModernEmpty icon="Users" title={t('users.noneFound')} />
              ) : (
                utilisateursFiltres.map(u => (
                  <article key={u.id} className={`rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${u.actif ? '' : 'opacity-70'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-blue-900 text-sm truncate">{displayUserName(u)}</h2>
                        <p className="text-xs text-gray-500 break-all mt-1">{u.email}</p>
                      </div>
                      <span className={`shrink-0 text-xs px-3 py-0.5 rounded-full font-medium ${u.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.actif ? t('common.active') : t('common.inactive')}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">{t('users.role')}</p>
                        {peutModifier(u) ? (
                          <RoleSelect user={u} onChangeRole={changerRole} t={t} />
                        ) : (
                          <RoleBadge user={u} t={t} />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {peutModifier(u) ? (
                          <>
                            <button
                              onClick={() => toggleActif(u)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${u.actif ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                              <AppIcon name={u.actif ? 'Clock' : 'CheckCircle'} className="h-3.5 w-3.5" />
                              {u.actif ? t('users.disable') : t('users.enable')}
                            </button>
                            <details className="relative">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200">
                                <AppIcon name="Settings" className="h-3.5 w-3.5" />
                                {t('common.more')}
                              </summary>
                              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                <button
                                  type="button"
                                  onClick={() => supprimerUtilisateur(u.id, u.email)}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-red-700 transition hover:bg-red-50"
                                >
                                  <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                                  {t('common.delete')}
                                </button>
                              </div>
                            </details>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">{protectedUserReason(u, t)}</span>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '720px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">{t('users.name')}</th>
                    <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">{t('users.email')}</th>
                    <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">{t('users.role')}</th>
                    <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">{t('users.status')}</th>
                    <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">{t('users.registration')}</th>
                    <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">{t('users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisateursFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">{t('users.noneFound')}</td>
                    </tr>
                  ) : (
                    utilisateursFiltres.map((u, i) => (
                      <tr key={u.id} className={`border-b border-gray-50 transition hover:bg-blue-50/50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${u.actif ? '' : 'opacity-70'}`}>
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-blue-900 text-sm">{displayUserName(u)}</span>
                        </td>
                        <td className="px-3 py-1.5 text-sm text-gray-600">{u.email}</td>
                        <td className="px-3 py-1.5">
                          {peutModifier(u) ? (
                            <RoleSelect user={u} onChangeRole={changerRole} t={t} />
                          ) : (
                            <RoleBadge user={u} t={t} />
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <StatusBadge status={u.actif ? 'VALIDE' : 'ANNULEE'}>
                            {u.actif ? t('common.active') : t('common.inactive')}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-400">
                          {u.dateInscription ? new Date(u.dateInscription).toLocaleDateString(i18n.language) : '—'}
                        </td>
                        <td className="px-3 py-1.5">
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
                                <details className="relative">
                                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200">
                                    <AppIcon name="Settings" className="h-3.5 w-3.5" />
                                    {t('common.more')}
                                  </summary>
                                  <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                    <button
                                      type="button"
                                      onClick={() => supprimerUtilisateur(u.id, u.email)}
                                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-red-700 transition hover:bg-red-50"
                                    >
                                      <AppIcon name="XCircle" className="h-3.5 w-3.5" />
                                      {t('common.delete')}
                                    </button>
                                  </div>
                                </details>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">{protectedUserReason(u, t)}</span>
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
    </div>
  );
}

function displayUserName(user) {
  return [user?.prenom, user?.nom].filter(Boolean).join(' ').trim() || user?.email || '—';
}

function canManageUser(user) {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return false;
  return true;
}

function protectedUserReason(user, t) {
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    return t('users.protectedRole');
  }
  return t('users.readOnly');
}

function ModernEmpty({ icon, title }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-gray-400 shadow-sm">
      <AppIcon name={icon} className="mx-auto mb-3 h-10 w-10 text-blue-300" />
      <p className="text-sm">{title}</p>
    </div>
  );
}

function RoleBadge({ user, t }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-white"
      style={{ background: roleColor(user.role) }}
    >
      <AppIcon name={roleIcon(user.role)} className="h-3.5 w-3.5" />
      {t(`roles.${user.role}`, { defaultValue: user.role })}
    </span>
  );
}

function RoleSelect({ user, onChangeRole, t }) {
  return (
    <select
      value={user.role}
      onChange={event => onChangeRole(user, event.target.value)}
      className="max-w-full rounded-lg border border-transparent px-2 py-1 text-xs font-semibold text-white shadow-sm transition focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
      style={{ background: roleColor(user.role) }}
      aria-label={t('users.changeRole')}
    >
      {ROLES.map(role => (
        <option key={role} value={role} className="bg-white text-slate-900">
          {t(`roles.${role}`, { defaultValue: role })}
        </option>
      ))}
    </select>
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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

const emptyGroupeForm = {
  nom: '',
  description: '',
  categorie: '',
  theme: '',
  objectif: '',
  capaciteMax: '',
  referentId: '',
};

export default function AdminGroupes() {
  const { t, i18n } = useTranslation();
  const [groupes, setGroupes] = useState([]);
  const [referents, setReferents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [onglet, setOnglet] = useState('en-attente');
  const [motifRefus, setMotifRefus] = useState('');
  const [groupeARefuser, setGroupeARefuser] = useState(null);
  const [groupeForm, setGroupeForm] = useState(emptyGroupeForm);

  const referentsActifs = referents.filter(referent => referent.actif);

  const fetchReferents = useCallback(async () => {
    try {
      const res = await api.get('/admin/referents');
      setReferents(res.data);
    } catch {
      setError(t('referent.errorLoad'));
    }
  }, []);

  const fetchGroupes = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = onglet === 'en-attente'
        ? '/admin/groupes/en-attente'
        : '/admin/groupes';
      const res = await api.get(endpoint);
      setGroupes(res.data);
    } catch {
      setError(t('admin.errorGroupsLoad'));
    } finally {
      setLoading(false);
    }
  }, [onglet]);

  useEffect(() => {
    fetchGroupes();
    fetchReferents();
  }, [fetchGroupes, fetchReferents]);

  const handleFormChange = (field, value) => {
    setGroupeForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateGroupe = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await api.post('/admin/groupes', {
        ...groupeForm,
        capaciteMax: Number(groupeForm.capaciteMax) || 0,
        referentId: Number(groupeForm.referentId),
      });
      setMessage(t('admin.groupCreated'));
      setGroupeForm(emptyGroupeForm);
      setOnglet('tous');
      await fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError(t('admin.errorGroupCreate'));
    } finally {
      setCreating(false);
    }
  };

  const handleAssignerReferent = async (groupeId, referentId) => {
    setAssigningId(groupeId);
    setError('');

    try {
      const res = await api.patch(`/admin/groupes/${groupeId}/referent/${referentId}`);
      setGroupes(prev => prev.map(groupe => groupe.id === groupeId ? res.data : groupe));
      setMessage(t('admin.referentAssigned'));
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError(t('admin.errorReferentAssign'));
    } finally {
      setAssigningId(null);
    }
  };

  const handleValider = async (id) => {
    try {
      await api.patch(`/admin/groupes/${id}/valider`);
      setMessage(t('admin.groupValidated'));
      fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError(t('admin.errorGroupValidate')); }
  };

  const handleRefuser = async () => {
    if (!groupeARefuser) return;
    try {
      await api.patch(`/admin/groupes/${groupeARefuser}/refuser`, { motif: motifRefus || t('admin.notSpecified') });
      setMessage(t('admin.groupRefused'));
      setGroupeARefuser(null);
      setMotifRefus('');
      fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError(t('admin.errorGroupRefuse')); }
  };

  const referentLabel = (referent) => `${referent.prenom || ''} ${referent.nom || ''}`.trim() || referent.email;

  const referentAssigne = (groupe) => {
    const referent = referents.find(item => item.id === groupe.referentId);
    if (referent) return referentLabel(referent);
    return `${groupe.referentPrenom || ''} ${groupe.referentNom || ''}`.trim() || t('admin.noReferentAssigned');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        <h1 className="text-2xl font-bold text-blue-900 mb-6">👥 {t('admin.groupsManagement')}</h1>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        <section className="bg-white rounded-2xl shadow p-5 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-4">{t('admin.createGroup')}</h2>
          <form onSubmit={handleCreateGroupe} className="grid md:grid-cols-2 gap-4">
            <Input
              label={t('admin.groupName')}
              value={groupeForm.nom}
              onChange={value => handleFormChange('nom', value)}
              required
            />
            <Input
              label={t('activities.form_category')}
              value={groupeForm.categorie}
              onChange={value => handleFormChange('categorie', value)}
            />
            <Input
              label={t('activities.form_theme')}
              value={groupeForm.theme}
              onChange={value => handleFormChange('theme', value)}
            />
            <Input
              label={t('admin.maxCapacity')}
              value={groupeForm.capaciteMax}
              onChange={value => handleFormChange('capaciteMax', value)}
              type="number"
              min="0"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('admin.activeReferent')}</label>
              <select
                value={groupeForm.referentId}
                onChange={e => handleFormChange('referentId', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">{t('admin.selectReferent')}</option>
                {referentsActifs.map(referent => (
                  <option key={referent.id} value={referent.id}>{referentLabel(referent)}</option>
                ))}
              </select>
              {referentsActifs.length === 0 && (
                <p className="text-xs text-red-600 mt-1">{t('admin.noActiveReferent')}</p>
              )}
            </div>
            <TextArea
              label={t('activities.form_description')}
              value={groupeForm.description}
              onChange={value => handleFormChange('description', value)}
            />
            <TextArea
              label={t('admin.objective')}
              value={groupeForm.objectif}
              onChange={value => handleFormChange('objectif', value)}
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating || referentsActifs.length === 0}
                className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                {creating ? t('common.creating') : t('admin.createGroup')}
              </button>
            </div>
          </form>
        </section>

        {/* Onglets */}
        <div className="flex gap-3 mb-6">
          {[
            { id: 'en-attente', label: t('admin.pendingTab') },
            { id: 'tous',       label: t('admin.allGroupsTab') },
          ].map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                onglet === o.id ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'
              }`}>
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : groupes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-gray-400 text-sm">
              {onglet === 'en-attente' ? t('admin.noPendingGroups') : t('admin.noGroups')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupes.map(g => (
              <div key={g.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-blue-900 text-lg">{g.nom}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                      {t('admin.referentLabel', { referent: referentAssigne(g) })}
                    </p>
                  </div>
                  <StatusBadge status={g.statut}>
                    {t(`statuses.${g.statut}`, { defaultValue: g.statut })}
                  </StatusBadge>
                </div>

                {g.description && <p className="text-gray-600 text-sm mb-3">{g.description}</p>}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500 mb-4">
                  {g.theme    && <span>🎨 {g.theme}</span>}
                  {g.categorie && <span>🏷️ {g.categorie}</span>}
                  {g.capaciteMax > 0 && <span>👥 Max {g.capaciteMax}</span>}
                  <span>📅 {new Date(g.dateCreation).toLocaleDateString(i18n.language || 'fr-BE')}</span>
                </div>

                {g.objectif && (
                  <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm text-blue-800">
                    <strong>{t('admin.objective')} :</strong> {g.objectif}
                  </div>
                )}

                {g.motifRefus && (
                  <div className="bg-red-50 rounded-xl p-3 mb-4 text-sm text-red-700">
                    <strong>{t('admin.refusalReason')} :</strong> {g.motifRefus}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t('admin.assignedReferent')}</label>
                  <select
                    value={g.referentId || ''}
                    onChange={e => handleAssignerReferent(g.id, e.target.value)}
                    disabled={assigningId === g.id || referentsActifs.length === 0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  >
                    {g.referentId && !referentsActifs.some(referent => referent.id === g.referentId) && (
                      <option value={g.referentId} disabled>{referentAssigne(g)}</option>
                    )}
                    {referentsActifs.map(referent => (
                      <option key={referent.id} value={referent.id}>{referentLabel(referent)}</option>
                    ))}
                  </select>
                </div>

                {g.statut === 'EN_ATTENTE' && (
                  <div className="flex gap-3">
                    <button onClick={() => handleValider(g.id)}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                      {t('admin.validateGroup')}
                    </button>
                    <button onClick={() => setGroupeARefuser(g.id)}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                      {t('admin.refuse')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal refus */}
        {groupeARefuser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-blue-900 mb-4">{t('admin.refuseGroup')}</h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.refusalReason')}</label>
              <textarea
                value={motifRefus}
                onChange={e => setMotifRefus(e.target.value)}
                rows={3}
                placeholder={t('admin.refusalReasonPlaceholder')}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={handleRefuser}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl transition">
                  {t('admin.confirmRefusal')}
                </button>
                <button onClick={() => { setGroupeARefuser(null); setMotifRefus(''); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, min }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        min={min}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />
    </div>
  );
}

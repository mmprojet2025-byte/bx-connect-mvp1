import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import { userFriendlyError } from '../../utils/userFriendlyError';
import AppIcon from '../../components/ui/AppIcons';
import { useTranslation } from 'react-i18next';

const TYPES = ['ANIMATION', 'LOGISTIQUE', 'COMMUNICATION', 'FORMATION', 'AUTRE'];

export default function Prestations() {
  const { t } = useTranslation();
  const [prestations, setPrestations] = useState([]);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titre: '', type: 'ANIMATION', datePrestation: '',
    dureeHeures: '', description: '', groupeId: ''
  });

  useEffect(() => {
    fetchPrestations();
    fetchMesGroupes();
  }, []);

  const fetchPrestations = async () => {
    try {
      const res = await api.get('/prestations/mes-prestations');
      setPrestations(res.data);
    } catch { setError(t('prestations.errorLoad')); }
    finally { setLoading(false); }
  };

  const fetchMesGroupes = async () => {
    try {
      const res = await api.get('/groupes/mes-groupes');
      setMesGroupes(res.data);
      if (res.data.length > 0) setForm(f => ({ ...f, groupeId: res.data[0].id }));
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await api.post('/prestations', {
        ...form,
        dureeHeures: parseFloat(form.dureeHeures),
        groupeId: parseInt(form.groupeId),
      });
      setMessage(t('prestations.successCreate'));
      setShowForm(false);
      setForm({ titre: '', type: 'ANIMATION', datePrestation: '', dureeHeures: '', description: '', groupeId: mesGroupes[0]?.id || '' });
      fetchPrestations();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(userFriendlyError(err, 'Action impossible.'));
    }
  };

  const statutStyle = (s) => {
    switch (s) {
      case 'VALIDEE':    return 'bg-green-100 text-green-700';
      case 'REFUSEE':    return 'bg-red-100 text-red-700';
      default:           return 'bg-yellow-100 text-yellow-700';
    }
  };

  const totalHeures = prestations
    .filter(p => p.statut === 'VALIDEE')
    .reduce((sum, p) => sum + (p.dureeHeures || 0), 0);
  const heuresEnAttente = prestations
    .filter(p => !['VALIDEE', 'REFUSEE'].includes(p.statut))
    .reduce((sum, p) => sum + (p.dureeHeures || 0), 0);
  const prestationsEnAttente = prestations.filter(p => !['VALIDEE', 'REFUSEE'].includes(p.statut)).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-blue-900">
              <AppIcon name="Handshake" className="h-6 w-6" />
              {t('prestations.myTitle')}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t('prestations.validatedTotal')} <strong className="text-green-700">{totalHeures.toFixed(1)}h</strong>
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
            <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
            {showForm ? t('common.cancel') : t('prestations.add')}
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <KpiCard icon="CheckCircle" label={t('prestations.validatedHours')} value={`${totalHeures.toFixed(1)}h`} tone="green" />
          <KpiCard icon="Clock" label={t('prestations.pendingHours')} value={`${heuresEnAttente.toFixed(1)}h`} tone="amber" />
          <KpiCard icon="ClipboardList" label={t('nav.prestations')} value={prestations.length} hint={t('prestations.pendingCount', { count: prestationsEnAttente })} tone="blue" />
        </div>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow p-5 mb-5">
            <h2 className="text-lg font-bold text-blue-900 mb-3">{t('prestations.new')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.title')} *</label>
                  <input required value={form.titre} onChange={e => setForm({...form, titre: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.type')} *</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')} *</label>
                  <input required type="date" value={form.datePrestation} onChange={e => setForm({...form, datePrestation: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('prestations.durationHours')} *</label>
                  <input required type="number" min="0.5" step="0.5" value={form.dureeHeures} onChange={e => setForm({...form, dureeHeures: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {mesGroupes.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.group')} *</label>
                    <select value={form.groupeId} onChange={e => setForm({...form, groupeId: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {mesGroupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('activities.form_description')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
                <AppIcon name="Save" className="h-4 w-4" />
                {t('prestations.submit')}
              </button>
            </form>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : prestations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <AppIcon name="Handshake" className="mx-auto mb-3 h-10 w-10 text-blue-300" />
            <p className="text-gray-400 text-sm">{t('prestations.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {prestations.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-blue-900">{p.titre}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p.type}</span>
                  </div>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1"><AppIcon name="Calendar" className="h-3.5 w-3.5" />{p.datePrestation}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><AppIcon name="Clock" className="h-3.5 w-3.5" />{p.dureeHeures}h</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><AppIcon name="Users" className="h-3.5 w-3.5" />{p.groupeNom}</span>
                  </p>
                  {p.commentaire && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 italic"><AppIcon name="MessageCircle" className="h-3.5 w-3.5" />{p.commentaire}</p>
                  )}
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ml-4 ${statutStyle(p.statut)}`}>
                  {p.statut}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function KpiCard({ icon, label, value, hint, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
          {hint && <p className="mt-0.5 text-xs font-semibold text-slate-500">{hint}</p>}
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tones[tone] || tones.blue}`}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

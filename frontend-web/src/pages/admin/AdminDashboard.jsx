import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(() => setError(t('admin.error_load')))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-900">🛡️ {t('admin.title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('admin.subtitle')}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('admin.loading')}</p>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard label={t('admin.stats_total_users')}   value={stats.totalUtilisateurs} color="#2E86AB" icon="👥" />
            <StatCard label={t('admin.stats_active')}        value={stats.membresActifs}      color="#28a745" icon="✅" />
            <StatCard label={t('admin.stats_activities')}    value={stats.totalActivites}     color="#F4A261" icon="🎯" />
            <StatCard label={t('admin.stats_registrations')} value={stats.totalInscriptions}  color="#6f42c1" icon="📋" />
            <StatCard label={t('admin.stats_admins')}        value={stats.totalAdmins}        color="#dc3545" icon="🛡️" />
            <StatCard label={t('admin.stats_referents')}     value={stats.totalReferents}     color="#17a2b8" icon="👤" />
            <StatCard label={t('admin.stats_members')}       value={stats.totalMembres}       color="#1A3C5E" icon="🙋" />
            <StatCard label={t('admin.stats_partners')}      value={stats.totalPartenaires}   color="#fd7e14" icon="🤝" />
          </div>
        )}

        <h2 className="text-lg font-bold text-blue-900 mb-4">{t('admin.manage')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <NavCard to="/admin/utilisateurs" icon="👥" title={t('admin.users_title')}      description={t('admin.users_desc')}      color="#2E86AB" />
          <NavCard to="/admin/activites"    icon="🎯" title={t('admin.activities_title')} description={t('admin.activities_desc')} color="#F4A261" />
          <NavCard to="/admin/projets"      icon="🚀" title={t('admin.projects_title')}   description={t('admin.projects_desc')}   color="#28a745" />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function NavCard({ to, icon, title, description, color }) {
  return (
    <Link to={to} className="no-underline">
      <div
        className="bg-white rounded-2xl shadow p-6 cursor-pointer transition hover:-translate-y-1"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <div className="text-3xl mb-3">{icon}</div>
        <h3 className="font-semibold text-blue-900 mb-1">{title}</h3>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
    </Link>
  );
}
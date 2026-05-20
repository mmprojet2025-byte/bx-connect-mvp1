import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function DashboardScreen({ navigation }) {
  const { user, logout, isAdmin, isReferent } = useAuth();

  const [inscriptions, setInscriptions] = useState([]);
  const [projets, setProjets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const peutGerer = isAdmin || isReferent;

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    try {
      const promises = [
        api.get('/inscriptions/mes-inscriptions').catch(() => ({ data: [] })),
        api.get('/projets/mes-projets').catch(() => ({ data: [] })),
      ];

      // ✅ Admin → charge aussi les stats
      if (peutGerer) {
        promises.push(api.get('/admin/stats').catch(() => ({ data: null })));
      }

      const results = await Promise.all(promises);
      setInscriptions(results[0].data);
      setProjets(results[1].data);
      if (peutGerer && results[2]) setStats(results[2].data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Carte bienvenue ── */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeName}>Bonjour, {user?.prenom} 👋</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Stats Admin ── */}
      {peutGerer && stats && (
        <>
          <Text style={styles.sectionTitle}>📊 Statistiques</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Utilisateurs" value={stats.totalUtilisateurs} color="#2563eb" />
            <StatCard label="Activités"    value={stats.totalActivites}    color="#d97706" />
            <StatCard label="Inscriptions" value={stats.totalInscriptions} color="#7c3aed" />
            <StatCard label="Membres actifs" value={stats.membresActifs}   color="#16a34a" />
          </View>
        </>
      )}

      {/* ── Raccourcis ── */}
      <Text style={styles.sectionTitle}>Navigation rapide</Text>
      {/* ✅ CORRECTION : avec Bottom Tab, on utilise navigation.navigate
          vers les noms des onglets Tab, pas les noms des écrans Stack */}
      <View style={styles.shortcutsGrid}>
        <ShortcutCard
          icon="🎯" label="Activités"
          onPress={() => navigation.getParent()?.navigate('TabActivities')}
        />
        <ShortcutCard
          icon="👥" label="Groupes"
          onPress={() => navigation.getParent()?.navigate('TabGroupes')}
        />
        <ShortcutCard
          icon="💬" label="Messages"
          onPress={() => navigation.getParent()?.navigate('TabMessagerie')}
        />
        <ShortcutCard
          icon="👤" label="Profil"
          onPress={() => navigation.getParent()?.navigate('TabProfile')}
        />
      </View>

      {/* ── Mes inscriptions ── */}
      <Text style={styles.sectionTitle}>Mes inscriptions</Text>
      <View style={styles.listCard}>
        {loading ? (
          <ActivityIndicator color="#1e3a5f" style={{ padding: 20 }} />
        ) : inscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>Aucune inscription pour le moment.</Text>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('TabActivities')}
            >
              <Text style={styles.emptyLink}>Découvrir les activités →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          inscriptions.slice(0, 4).map((ins, i) => (
            <View
              key={ins.id}
              style={[styles.listItem, i < Math.min(inscriptions.length, 4) - 1 && styles.listItemBorder]}
            >
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemTitle}>{ins.activiteTitre || 'Activité'}</Text>
                <Text style={styles.listItemSub}>{ins.statut}</Text>
              </View>
              <View style={styles.inscritBadge}>
                <Text style={styles.inscritText}>Inscrit</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Mes projets ── */}
      <Text style={styles.sectionTitle}>Mes projets</Text>
      <View style={styles.listCard}>
        {loading ? (
          <ActivityIndicator color="#1e3a5f" style={{ padding: 20 }} />
        ) : projets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚀</Text>
            <Text style={styles.emptyText}>Aucun projet pour le moment.</Text>
          </View>
        ) : (
          projets.slice(0, 4).map((p, i) => (
            <View
              key={p.id}
              style={[styles.listItem, i < Math.min(projets.length, 4) - 1 && styles.listItemBorder]}
            >
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemTitle}>{p.titre}</Text>
                <Text style={styles.listItemSub}>{p.statut}</Text>
              </View>
              <View style={[styles.statutBadge, { backgroundColor: statutColor(p.statut) }]}>
                <Text style={styles.statutText}>{p.statut}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Déconnexion ── */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.btnLogout} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.btnLogoutText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
        <Text style={styles.logoutHint}>Connecté en tant que {user?.email}</Text>
      </View>

    </ScrollView>
  );
}

function ShortcutCard({ icon, label, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.shortcutCard, disabled && styles.shortcutDisabled]}
      onPress={disabled ? null : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={styles.shortcutIcon}>{icon}</Text>
      <Text style={[styles.shortcutLabel, disabled && styles.shortcutLabelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function statutColor(statut) {
  switch (statut) {
    case 'APPROUVE':  return '#16a34a';
    case 'EN_COURS':  return '#2563eb';
    case 'TERMINE':   return '#6b7280';
    case 'REJETE':    return '#dc2626';
    case 'SOUMIS':    return '#0891b2';
    default:          return '#d97706';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { padding: 16, paddingBottom: 40 },

  welcomeCard: {
    backgroundColor: '#1e3a5f', borderRadius: 20, padding: 20, marginBottom: 20,
  },
  welcomeLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  welcomeName: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  sectionTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#1e3a5f',
    marginBottom: 10, marginTop: 4,
  },

  // Stats Admin
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  statCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 8, marginRight: '2%',
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748b' },

  // Raccourcis
  shortcutsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  shortcutCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, alignItems: 'center', marginBottom: 10, marginRight: '2%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  shortcutDisabled: { opacity: 0.4 },
  shortcutIcon: { fontSize: 28, marginBottom: 6 },
  shortcutLabel: { fontSize: 13, fontWeight: '600', color: '#1e3a5f' },
  shortcutLabelDisabled: { color: '#94a3b8' },

  // Liste
  listCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  listItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listItemLeft: { flex: 1, marginRight: 8 },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: '#1e3a5f', marginBottom: 2 },
  listItemSub: { fontSize: 12, color: '#94a3b8' },
  inscritBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  inscritText: { color: '#16a34a', fontSize: 11, fontWeight: '600' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  emptyState: { alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  emptyLink: { color: '#2563eb', fontSize: 13 },

  logoutSection: {
    marginTop: 8, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  btnLogout: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 8,
  },
  btnLogoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  logoutHint: { textAlign: 'center', color: '#94a3b8', fontSize: 12 },
});
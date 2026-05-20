import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ActivitiesScreen() {
  const { isAuthenticated, isAdmin, isReferent } = useAuth();

  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('TOUS');

  // ✅ ADMIN/REFERENT voient toutes les activités, les autres voient les publiées
  const peutGerer = isAdmin || isReferent;

  useEffect(() => {
    fetchActivites();
  }, []);

  const fetchActivites = async () => {
    try {
      setError('');
      // ✅ ADMIN/REFERENT → endpoint admin (toutes les activités)
      // ✅ MEMBRE/VISITEUR → endpoint public (activités publiées seulement)
      const endpoint = peutGerer ? '/activites/admin/toutes' : '/activites';
      const res = await api.get(endpoint);
      setActivites(res.data);
    } catch (err) {
      // Si l'endpoint admin échoue (ex: token expiré), fallback sur public
      try {
        const res = await api.get('/activites');
        setActivites(res.data);
      } catch {
        setError('Impossible de charger les activités.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInscrire = async (activiteId) => {
    if (!isAuthenticated) return;
    try {
      setMessage('');
      await api.post('/inscriptions', { activiteId });
      setMessage('✅ Inscription réussie !');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription.");
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePublier = async (activiteId) => {
    try {
      await api.patch(`/activites/${activiteId}/statut?statut=PUBLIEE`);
      setMessage('✅ Activité publiée !');
      fetchActivites();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError('Erreur lors de la publication.');
    }
  };

  // Filtres
  const STATUTS = peutGerer
    ? ['TOUS', 'BROUILLON', 'PUBLIEE', 'ANNULEE', 'TERMINEE']
    : ['TOUS'];

  const activitesFiltrees = activites.filter(a => {
    const matchRecherche =
      a.titre?.toLowerCase().includes(recherche.toLowerCase()) ||
      a.lieu?.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = filtreStatut === 'TOUS' || a.statut === filtreStatut;
    return matchRecherche && matchStatut;
  });

  const renderActivite = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardImagePlaceholder}>
        <Text style={styles.cardImageIcon}>🎯</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.titre}</Text>
          <View style={[styles.statutBadge, { backgroundColor: statutColor(item.statut) }]}>
            <Text style={styles.statutText}>{item.statut}</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        )}

        <View style={styles.cardInfos}>
          {item.lieu && <Text style={styles.cardInfo}>📍 {item.lieu}</Text>}
          {item.dateDebut && (
            <Text style={styles.cardInfo}>
              📅 {new Date(item.dateDebut).toLocaleDateString('fr-BE')}
            </Text>
          )}
          <Text style={styles.cardInfo}>
            {item.gratuite ? '🆓 Gratuit' : `💶 ${item.prix} €`}
          </Text>
          {item.capaciteMax > 0 && (
            <Text style={styles.cardInfo}>👥 Max {item.capaciteMax} personnes</Text>
          )}
          {/* ✅ Affiche le créateur pour Admin/Référent */}
          {peutGerer && item.createurPrenom && (
            <Text style={styles.cardInfo}>
              👤 Créé par {item.createurPrenom} {item.createurNom}
            </Text>
          )}
        </View>

        {/* ✅ Boutons selon le rôle */}
        <View style={styles.cardActions}>
          {/* Membre connecté → S'inscrire si activité publiée */}
          {isAuthenticated && !peutGerer && item.statut === 'PUBLIEE' && (
            <TouchableOpacity
              style={styles.btnInscrire}
              onPress={() => handleInscrire(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnInscrireText}>S'inscrire</Text>
            </TouchableOpacity>
          )}

          {/* Admin/Référent → Publier si brouillon */}
          {peutGerer && item.statut === 'BROUILLON' && (
            <TouchableOpacity
              style={styles.btnPublier}
              onPress={() => handlePublier(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPublierText}>▶ Publier</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher une activité..."
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
      </View>

      {/* ✅ Filtres statut pour Admin/Référent */}
      {peutGerer && (
        <View style={styles.filtresContainer}>
          {STATUTS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filtreBtn, filtreStatut === s && styles.filtreBtnActive]}
              onPress={() => setFiltreStatut(s)}
            >
              <Text style={[styles.filtreBtnText, filtreStatut === s && styles.filtreBtnTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ✅ Indicateur de mode pour Admin */}
      {peutGerer && (
        <View style={styles.adminBanner}>
          <Text style={styles.adminBannerText}>
            🛡️ Mode Admin — {activites.length} activité(s) au total
          </Text>
        </View>
      )}

      {/* Messages */}
      {message !== '' && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}
      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Liste */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Chargement des activités...</Text>
        </View>
      ) : activitesFiltrees.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyText}>
            {recherche ? 'Aucune activité trouvée.' : 'Aucune activité disponible.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activitesFiltrees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderActivite}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={false}
          onRefresh={fetchActivites}
        />
      )}

      {/* Bouton refresh sur web */}
      {Platform.OS === 'web' && (
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchActivites}>
          <Text style={styles.refreshBtnText}>🔄 Actualiser</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function statutColor(statut) {
  switch (statut) {
    case 'PUBLIEE':  return '#16a34a';
    case 'ANNULEE':  return '#dc2626';
    case 'TERMINEE': return '#6b7280';
    default:         return '#d97706';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  searchContainer: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1e293b',
  },

  // Filtres statut
  filtresContainer: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    flexWrap: 'wrap',
  },
  filtreBtn: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 4,
  },
  filtreBtnActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  filtreBtnText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  filtreBtnTextActive: { color: '#fff', fontWeight: '700' },

  // Bannière admin
  adminBanner: {
    backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#bfdbfe',
  },
  adminBannerText: { fontSize: 12, color: '#1e40af', fontWeight: '600' },

  // Messages
  successBox: {
    backgroundColor: '#f0fdf4', borderLeftWidth: 4, borderLeftColor: '#16a34a',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#dc2626',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  listContent: { padding: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardImagePlaceholder: {
    height: 80, backgroundColor: '#e2eaf0',
    alignItems: 'center', justifyContent: 'center',
  },
  cardImageIcon: { fontSize: 32 },
  cardBody: { padding: 14 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6,
  },
  cardTitle: {
    flex: 1, fontSize: 15, fontWeight: 'bold',
    color: '#1e3a5f', lineHeight: 20, marginRight: 8,
  },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 8 },
  cardInfos: { marginBottom: 10 },
  cardInfo: { fontSize: 12, color: '#64748b', marginBottom: 2 },

  cardActions: { flexDirection: 'row', gap: 8 },
  btnInscrire: {
    flex: 1, backgroundColor: '#1e3a5f', paddingVertical: 9,
    borderRadius: 10, alignItems: 'center',
  },
  btnInscrireText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnPublier: {
    flex: 1, backgroundColor: '#16a34a', paddingVertical: 9,
    borderRadius: 10, alignItems: 'center',
  },
  btnPublierText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  refreshBtn: {
    margin: 16, backgroundColor: '#e2eaf0', paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  refreshBtnText: { color: '#1e3a5f', fontWeight: '600', fontSize: 13 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
});
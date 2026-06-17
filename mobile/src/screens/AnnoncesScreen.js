import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';

export default function AnnoncesScreen() {
  const { isAuthenticated } = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchAnnonces(); }, []);

  const fetchAnnonces = async () => {
    try {
      setError('');
      const endpoint = isAuthenticated ? '/annonces/mes-annonces' : '/annonces/globales';
      const res = await api.get(endpoint);
      setAnnonces(res.data);
    } catch {
      setError('Impossible de charger les annonces.');
    } finally {
      setLoading(false);
    }
  };

  const typeStyle = (type) => ({
    GLOBALE: { bg: '#E0F2FE', color: '#1d4ed8' },
    GROUPE:  { bg: '#ede9fe', color: '#7c3aed' },
    SYSTEME: { bg: '#f1f5f9', color: '#64748b' },
  }[type] || { bg: '#f1f5f9', color: '#64748b' });

  const renderAnnonce = ({ item }) => {
    const ts = typeStyle(item.type);
    return (
      <View style={[styles.card, item.epinglee && styles.cardEpinglee]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {item.epinglee && <AppIcon name="pin" size={15} color="#38BDF8" style={styles.pinIcon} />}
            <Text style={styles.cardTitle} numberOfLines={2}>{item.titre}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: ts.bg }]}>
            <Text style={[styles.typeBadgeText, { color: ts.color }]}>
              {item.type === 'GLOBALE' ? 'Global' :
               item.type === 'GROUPE' ? item.groupeNom || 'Groupe' : 'Système'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardContenu}>{item.contenu}</Text>
        <Text style={styles.cardMeta}>
          Par {item.auteurPrenom} {item.auteurNom} ·{' '}
          {item.dateCreation ? new Date(item.dateCreation).toLocaleDateString('fr-BE') : ''}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <AppIcon name="alert" size={20} color="#1E3A8A" />
          <Text style={styles.headerTitle}>Annonces</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchAnnonces}>
          <AppIcon name="refresh" size={19} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : annonces.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <AppIcon name="alert" size={32} color="#38BDF8" />
          </View>
          <Text style={styles.emptyText}>Aucune annonce pour le moment.</Text>
        </View>
      ) : (
        <FlatList
          data={annonces}
          keyExtractor={item => item.id.toString()}
          renderItem={renderAnnonce}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchAnnonces}
          refreshing={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A8A' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: { padding: 4 },
  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#EF4444',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardEpinglee: { borderLeftWidth: 4, borderLeftColor: '#38BDF8' },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  pinIcon: { marginRight: 4 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E3A8A', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  cardContenu: { fontSize: 13, color: '#374151', lineHeight: 19, marginBottom: 8 },
  cardMeta: { fontSize: 11, color: '#94a3b8' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginBottom: 12,
  },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
});

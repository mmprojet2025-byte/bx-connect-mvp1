import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { useTranslation } from 'react-i18next';

export default function AnnoncesScreen() {
  const { t, i18n } = useTranslation();
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
      setError(t('announcements.loadError'));
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
              {item.type === 'GLOBALE' ? t('announcements.types.GLOBALE') :
               item.type === 'GROUPE' ? item.groupeNom || t('announcements.types.GROUPE') : t('announcements.types.SYSTEME')}
            </Text>
          </View>
        </View>
        <Text style={styles.cardContenu}>{item.contenu}</Text>
        <Text style={styles.cardMeta}>
          {t('announcements.byAuthor', {
            author: `${item.auteurPrenom || ''} ${item.auteurNom || ''}`.trim() || t('common.notAvailable'),
          })} ·{' '}
          {item.dateCreation ? new Date(item.dateCreation).toLocaleDateString(i18n.language || 'fr-BE') : ''}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <AppIcon name="alert" size={20} color="#1E3A8A" />
          <Text style={styles.headerTitle}>{t('navigation.announcements')}</Text>
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
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : annonces.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <AppIcon name="alert" size={32} color="#38BDF8" />
          </View>
          <Text style={styles.emptyText}>{t('announcements.empty')}</Text>
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
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#1E3A8A' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: { padding: 4 },
  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#EF4444',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13 },
  listContent: { padding: 9, paddingBottom: 22 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardEpinglee: { borderLeftWidth: 4, borderLeftColor: '#38BDF8' },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 5,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  pinIcon: { marginRight: 4 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#1E3A8A', flex: 1, lineHeight: 18 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  cardContenu: { fontSize: 12, color: '#374151', lineHeight: 16, marginBottom: 6 },
  cardMeta: { fontSize: 10, color: '#94a3b8' },
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

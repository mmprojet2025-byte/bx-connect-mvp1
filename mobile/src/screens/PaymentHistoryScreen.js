import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function PaymentHistoryScreen() {
  const { isAuthenticated } = useAuth();

  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtre, setFiltre] = useState('TOUS');

  useEffect(() => {
    if (isAuthenticated) fetchHistorique();
    else setLoading(false);
  }, []);

  const fetchHistorique = async () => {
    try {
      setError('');
      const res = await api.get('/stripe/historique');
      setPaiements(res.data);
    } catch {
      setError('Impossible de charger l\'historique.');
    } finally {
      setLoading(false);
    }
  };

  const FILTRES = ['TOUS', 'PAYE', 'EN_ATTENTE', 'ANNULE'];

  const paiementsFiltres = paiements.filter(p =>
    filtre === 'TOUS' || p.statutPaiement === filtre
  );

  const totalPaye = paiements
    .filter(p => p.statutPaiement === 'PAYE')
    .reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);

  const statutColor = (statut) => {
    switch (statut) {
      case 'PAYE':       return { bg: '#dcfce7', color: '#22C55E' };
      case 'EN_ATTENTE': return { bg: '#fef9c3', color: '#d97706' };
      case 'ANNULE':     return { bg: '#f1f5f9', color: '#64748b' };
      case 'ECHOUE':     return { bg: '#fef2f2', color: '#EF4444' };
      case 'REMBOURSE':  return { bg: '#f3e8ff', color: '#7c3aed' };
      default:           return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const fournisseurIcon = (f) => f === 'STRIPE' ? '💳' : f === 'PAYPAL' ? '🅿️' : '📋';

  const renderPaiement = ({ item }) => {
    const sc = statutColor(item.statutPaiement);
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{fournisseurIcon(item.fournisseur)}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.activiteTitre ? `🎯 ${item.activiteTitre}` :
               item.projetTitre   ? `🚀 ${item.projetTitre}` :
               'Soutien BX-CONNECT'}
            </Text>
            <Text style={styles.cardDate}>
              {item.fournisseur || 'STRIPE'} ·{' '}
              {item.dateCreation
                ? new Date(item.dateCreation).toLocaleDateString('fr-BE')
                : '—'}
            </Text>
            {item.message && (
              <Text style={styles.cardMessage} numberOfLines={1}>
                {'"'}{item.message}{'"'}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.montant}>{item.montant} €</Text>
          <View style={[styles.statutBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statutText, { color: sc.color }]}>
              {item.statutPaiement}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🔐</Text>
        <Text style={styles.emptyTitle}>Connexion requise</Text>
        <Text style={styles.emptyText}>Connectez-vous pour voir votre historique.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📋 Historique paiements</Text>
          <Text style={styles.headerSub}>
            Total payé : <Text style={styles.totalPaye}>{totalPaye.toFixed(2)} €</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchHistorique}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      <View style={styles.filtresRow}>
        {FILTRES.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtreBtn, filtre === f && styles.filtreBtnActive]}
            onPress={() => setFiltre(f)}
          >
            <Text style={[styles.filtreBtnText, filtre === f && styles.filtreBtnTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Erreur */}
      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Liste */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : paiementsFiltres.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>Aucun paiement</Text>
          <Text style={styles.emptyText}>
            {filtre === 'TOUS'
              ? 'Vous n\'avez pas encore effectué de paiement.'
              : `Aucun paiement avec le statut "${filtre}".`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={paiementsFiltres}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPaiement}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchHistorique}
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
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E3A8A' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  totalPaye: { fontWeight: 'bold', color: '#22C55E' },
  refreshBtn: {
    width: 36, height: 36, backgroundColor: '#f1f5f9',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  refreshBtnText: { fontSize: 18 },

  filtresRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    gap: 6,
  },
  filtreBtn: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  filtreBtnActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  filtreBtnText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  filtreBtnTextActive: { color: '#fff', fontWeight: '700' },

  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#EF4444',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

  listContent: { padding: 12 },

  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  iconContainer: {
    width: 44, height: 44, backgroundColor: '#f1f5f9',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  icon: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1E3A8A', marginBottom: 2 },
  cardDate: { fontSize: 11, color: '#94a3b8' },
  cardMessage: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2 },

  cardRight: { alignItems: 'flex-end' },
  montant: { fontSize: 15, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 4 },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statutText: { fontSize: 10, fontWeight: '600' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 6 },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
});

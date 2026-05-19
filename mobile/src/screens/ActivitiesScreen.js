import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ActivitiesScreen({ navigation }) {
  const { isAuthenticated } = useAuth();

  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    fetchActivites();
  }, []);

  const fetchActivites = async () => {
    try {
      setError('');
      const res = await api.get('/activites');
      setActivites(res.data);
    } catch {
      setError('Impossible de charger les activités.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivites();
  };

  const handleInscrire = async (activiteId) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
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

  const activitesFiltrees = activites.filter(a =>
    a.titre?.toLowerCase().includes(recherche.toLowerCase()) ||
    a.lieu?.toLowerCase().includes(recherche.toLowerCase())
  );

  const renderActivite = ({ item }) => (
    <View style={styles.card}>
      {/* Image placeholder */}
      <View style={styles.cardImagePlaceholder}>
        <Text style={styles.cardImageIcon}>🎯</Text>
      </View>

      <View style={styles.cardBody}>
        {/* En-tête */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.titre}</Text>
          <View style={[styles.statutBadge, { backgroundColor: statutColor(item.statut) }]}>
            <Text style={styles.statutText}>{item.statut}</Text>
          </View>
        </View>

        {/* Description */}
        {item.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Infos */}
        <View style={styles.cardInfos}>
          {item.lieu && (
            <Text style={styles.cardInfo}>📍 {item.lieu}</Text>
          )}
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
        </View>

        {/* Bouton inscription */}
        {item.statut === 'PUBLIEE' && (
          <TouchableOpacity
            style={styles.btnInscrire}
            onPress={() => handleInscrire(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnInscrireText}>
              {isAuthenticated ? "S'inscrire" : "Se connecter pour s'inscrire"}
            </Text>
          </TouchableOpacity>
        )}
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
            {recherche ? 'Aucune activité trouvée.' : 'Aucune activité disponible pour le moment.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activitesFiltrees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderActivite}
          contentContainerStyle={styles.listContent}
          refreshControl={
            // RefreshControl non supporté sur web → on l'affiche seulement sur mobile
            Platform.OS !== 'web' ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#1e3a5f']}
                tintColor="#1e3a5f"
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bouton refresh manuel sur web */}
      {Platform.OS === 'web' && (
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
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
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },

  // Recherche
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },

  // Messages
  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  successText: {
    color: '#15803d',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },

  // Liste — marginBottom sur la carte au lieu de gap (compatibilité web)
  listContent: {
    padding: 16,
  },

  // Carte activité — marginBottom remplace gap
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16, // ✅ Compatible web (gap ne l'est pas toujours)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImagePlaceholder: {
    height: 100,
    backgroundColor: '#e2eaf0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageIcon: {
    fontSize: 40,
  },
  cardBody: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e3a5f',
    lineHeight: 22,
    marginRight: 8,
  },
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statutText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardInfos: {
    marginBottom: 12,
  },
  cardInfo: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 3,
  },

  // Bouton inscription
  btnInscrire: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnInscrireText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Bouton refresh web
  refreshBtn: {
    margin: 16,
    backgroundColor: '#e2eaf0',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshBtnText: {
    color: '#1e3a5f',
    fontWeight: '600',
    fontSize: 13,
  },

  // États vides / chargement
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
});
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function NotificationsScreen() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setError('');
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch {
      // Si l'endpoint n'existe pas encore, on affiche des notifications simulées
      setNotifications(getNotificationsSimulees());
    } finally {
      setLoading(false);
    }
  };

  const handleMarquerLue = async (id) => {
    try {
      await api.patch(`/notifications/${id}/lue`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, lue: true } : n)
      );
    } catch {
      // Mise à jour locale si l'endpoint n'existe pas
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, lue: true } : n)
      );
    }
  };

  const handleMarquerToutesLues = async () => {
    try {
      await api.patch('/notifications/toutes-lues');
    } catch {
      // Mise à jour locale
    }
    setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
  };

  const handleSupprimer = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      // Suppression locale
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const nonLues = notifications.filter(n => !n.lue).length;

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.lue && styles.notifCardUnread]}
      onPress={() => handleMarquerLue(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.notifLeft}>
        <View style={[styles.notifIcon, { backgroundColor: typeColor(item.type) }]}>
          <Text style={styles.notifIconText}>{typeIcon(item.type)}</Text>
        </View>
        {!item.lue && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.lue && styles.notifTitleUnread]}>
          {item.titre || item.message}
        </Text>
        {item.message && item.titre && (
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
        )}
        <Text style={styles.notifDate}>
          {item.date ? new Date(item.date).toLocaleDateString('fr-BE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }) : 'Récemment'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleSupprimer(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔔 Notifications</Text>
          {nonLues > 0 && (
            <Text style={styles.headerSub}>{nonLues} non lue{nonLues > 1 ? 's' : ''}</Text>
          )}
        </View>
        {nonLues > 0 && (
          <TouchableOpacity
            style={styles.btnToutesLues}
            onPress={handleMarquerToutesLues}
          >
            <Text style={styles.btnToutesLuesText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
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
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptyText}>
            Tu seras notifié lors d'inscriptions, validations de projets et annonces.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchNotifications}
          refreshing={false}
        />
      )}
    </View>
  );
}

// ─── Notifications simulées (si l'endpoint backend n'existe pas encore) ───────
function getNotificationsSimulees() {
  return [
    {
      id: 1,
      type: 'INSCRIPTION',
      titre: 'Inscription confirmée',
      message: 'Votre inscription à "Atelier Coding Jeunes" a été confirmée.',
      date: new Date().toISOString(),
      lue: false,
    },
    {
      id: 2,
      type: 'PROJET',
      titre: 'Projet approuvé',
      message: 'Votre projet a été approuvé par l\'administrateur.',
      date: new Date(Date.now() - 86400000).toISOString(),
      lue: false,
    },
    {
      id: 3,
      type: 'ANNONCE',
      titre: 'Nouvelle annonce',
      message: 'L\'administrateur a publié une nouvelle annonce pour tous les membres.',
      date: new Date(Date.now() - 172800000).toISOString(),
      lue: true,
    },
    {
      id: 4,
      type: 'PAIEMENT',
      titre: 'Paiement confirmé',
      message: 'Votre paiement PayPal de 10€ a été traité avec succès.',
      date: new Date(Date.now() - 259200000).toISOString(),
      lue: true,
    },
  ];
}

function typeIcon(type) {
  switch (type) {
    case 'INSCRIPTION': return '🎯';
    case 'PROJET':      return '🚀';
    case 'ANNONCE':     return '📢';
    case 'PAIEMENT':    return '💶';
    case 'MESSAGE':     return '💬';
    default:            return '🔔';
  }
}

function typeColor(type) {
  switch (type) {
    case 'INSCRIPTION': return '#dbeafe';
    case 'PROJET':      return '#dcfce7';
    case 'ANNONCE':     return '#fef9c3';
    case 'PAIEMENT':    return '#fce7f3';
    case 'MESSAGE':     return '#ede9fe';
    default:            return '#f1f5f9';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' },
  headerSub: { fontSize: 12, color: '#2563eb', marginTop: 2 },
  btnToutesLues: {
    backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#bfdbfe',
  },
  btnToutesLuesText: { color: '#2563eb', fontSize: 12, fontWeight: '600' },

  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#dc2626',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  listContent: { padding: 12 },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  notifCardUnread: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3, borderLeftColor: '#2563eb',
  },

  notifLeft: { position: 'relative', marginRight: 12 },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  notifIconText: { fontSize: 20 },
  unreadDot: {
    position: 'absolute', top: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#2563eb', borderWidth: 2, borderColor: '#fff',
  },

  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 3 },
  notifTitleUnread: { fontWeight: '700', color: '#1e3a5f' },
  notifMessage: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 4 },
  notifDate: { fontSize: 11, color: '#94a3b8' },

  deleteBtn: { padding: 4, marginLeft: 8 },
  deleteBtnText: { color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
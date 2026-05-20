import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function GroupesScreen({ navigation }) {
  const { user, isAdmin, isReferent } = useAuth();

  const [groupes, setGroupes] = useState([]);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', description: '', type: 'GENERAL' });
  const [creating, setCreating] = useState(false);

  const peutGerer = isAdmin || isReferent;

  useEffect(() => {
    fetchGroupes();
    if (user) fetchMesGroupes();
  }, []);

  const fetchGroupes = async () => {
    try {
      setError('');
      const res = await api.get('/groupes');
      setGroupes(res.data);
    } catch {
      setError('Impossible de charger les groupes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMesGroupes = async () => {
    try {
      const res = await api.get('/groupes/mes-groupes');
      setMesGroupes(res.data);
    } catch {
      // silencieux
    }
  };

  const handleRejoindre = async (groupeId) => {
    setMessage(''); setError('');
    try {
      await api.post(`/groupes/${groupeId}/rejoindre`);
      setMessage('✅ Vous avez rejoint le groupe !');
      fetchGroupes(); fetchMesGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la demande.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleQuitter = async (groupeId) => {
    setMessage(''); setError('');
    try {
      await api.delete(`/groupes/${groupeId}/quitter`);
      setMessage('✅ Vous avez quitté le groupe.');
      fetchGroupes(); fetchMesGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la demande.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreer = async () => {
    if (!form.nom.trim()) {
      setError('Le nom du groupe est obligatoire.');
      return;
    }
    setCreating(true);
    setMessage(''); setError('');
    try {
      await api.post('/groupes', form);
      setMessage('✅ Groupe créé avec succès !');
      setShowForm(false);
      setForm({ nom: '', description: '', type: 'GENERAL' });
      fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const mesGroupesIds = mesGroupes.map((g) => g.id);
  const groupesFiltres = groupes.filter((g) =>
    g.nom?.toLowerCase().includes(recherche.toLowerCase())
  );

  const typeBadge = (type) => ({
    ADMIN:     { bg: '#fef2f2', color: '#dc2626' },
    PROJET:    { bg: '#f0fdf4', color: '#16a34a' },
    EVENEMENT: { bg: '#fffbeb', color: '#d97706' },
    GENERAL:   { bg: '#eff6ff', color: '#2563eb' },
  }[type] || { bg: '#eff6ff', color: '#2563eb' });

  const renderGroupe = ({ item }) => {
    const estMembre = mesGroupesIds.includes(item.id);
    const badge = typeBadge(item.type);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.nom}</Text>
          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.typeBadgeText, { color: badge.color }]}>
              {item.type || 'GÉNÉRAL'}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        )}

        <Text style={styles.cardMembers}>
          👤 {item.nombreMembres ?? 0} membre{(item.nombreMembres ?? 0) !== 1 ? 's' : ''}
        </Text>

        {user && (
          estMembre ? (
            <TouchableOpacity
              style={styles.btnQuitter}
              onPress={() => handleQuitter(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnQuitterText}>Quitter le groupe</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.btnRejoindre}
              onPress={() => handleRejoindre(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnRejoindreText}>Rejoindre</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher un groupe..."
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        {peutGerer && (
          <TouchableOpacity
            style={styles.btnNew}
            onPress={() => setShowForm(!showForm)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnNewText}>{showForm ? '✕' : '+'}</Text>
          </TouchableOpacity>
        )}
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

      {/* Formulaire création groupe */}
      {showForm && peutGerer && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Nouveau groupe</Text>

          <Text style={styles.label}>Nom *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom du groupe"
            placeholderTextColor="#94a3b8"
            value={form.nom}
            onChangeText={(val) => setForm({ ...form, nom: val })}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Description du groupe..."
            placeholderTextColor="#94a3b8"
            value={form.description}
            onChangeText={(val) => setForm({ ...form, description: val })}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typesRow}>
            {['GENERAL', 'PROJET', 'EVENEMENT'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                onPress={() => setForm({ ...form, type: t })}
              >
                <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btnCreate, creating && styles.btnDisabled]}
            onPress={handleCreer}
            disabled={creating}
            activeOpacity={0.8}
          >
            {creating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnCreateText}>Créer le groupe</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Mes groupes */}
      {user && mesGroupes.length > 0 && (
        <View style={styles.mesGroupesContainer}>
          <Text style={styles.mesGroupesTitle}>📌 Mes groupes</Text>
          <View style={styles.mesGroupesTags}>
            {mesGroupes.map((g) => (
              <View key={g.id} style={styles.mesGroupesTag}>
                <Text style={styles.mesGroupesTagText}>{g.nom}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Liste */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Chargement des groupes...</Text>
        </View>
      ) : groupesFiltres.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>
            {recherche ? 'Aucun groupe trouvé.' : 'Aucun groupe disponible.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupesFiltres}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGroupe}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  searchInput: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1e293b',
  },
  btnNew: {
    width: 40, height: 40, backgroundColor: '#1e3a5f',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  btnNewText: { color: '#fff', fontSize: 22, fontWeight: 'bold', lineHeight: 26 },

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

  formCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14,
    color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 12,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  typesRow: { flexDirection: 'row', marginBottom: 14 },
  typeBtn: {
    flex: 1, borderWidth: 2, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 8, alignItems: 'center', marginRight: 6,
  },
  typeBtnActive: { borderColor: '#1e3a5f', backgroundColor: '#eff6ff' },
  typeBtnText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  typeBtnTextActive: { color: '#1e3a5f', fontWeight: '700' },
  btnCreate: {
    backgroundColor: '#1e3a5f', paddingVertical: 12,
    borderRadius: 12, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnCreateText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  mesGroupesContainer: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  mesGroupesTitle: { fontSize: 13, fontWeight: '600', color: '#1e3a5f', marginBottom: 8 },
  mesGroupesTags: { flexDirection: 'row', flexWrap: 'wrap' },
  mesGroupesTag: {
    backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginRight: 6, marginBottom: 4,
  },
  mesGroupesTagText: { color: '#fff', fontSize: 12 },

  listContent: { padding: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#1e3a5f', marginRight: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 8 },
  cardMembers: { fontSize: 12, color: '#94a3b8', marginBottom: 10 },

  btnRejoindre: {
    backgroundColor: '#1e3a5f', paddingVertical: 9,
    borderRadius: 10, alignItems: 'center',
  },
  btnRejoindreText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnQuitter: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    paddingVertical: 9, borderRadius: 10, alignItems: 'center',
  },
  btnQuitterText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
});
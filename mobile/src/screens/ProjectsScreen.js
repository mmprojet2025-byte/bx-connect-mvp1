import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, ScrollView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ProjectsScreen() {
  const { isAuthenticated, isAdmin, isReferent, user } = useAuth();

  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('TOUS');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    budgetDemande: '',
  });

  const peutGerer = isAdmin || isReferent;
  const STATUTS_FILTRES = peutGerer
    ? ['TOUS', 'BROUILLON', 'SOUMIS', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REJETE']
    : ['TOUS', 'APPROUVE', 'EN_COURS', 'TERMINE'];

  useEffect(() => {
    fetchProjets();
  }, []);

  const fetchProjets = async () => {
    try {
      setError('');
      // ✅ Admin/Référent → tous les projets
      // ✅ Membre/Visiteur → projets publics (APPROUVE, EN_COURS, TERMINE)
      const endpoint = peutGerer ? '/projets/admin/tous' : '/projets';
      const res = await api.get(endpoint);
      setProjets(res.data);
    } catch {
      setError('Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  };

  const handleProposer = async () => {
    if (!form.titre.trim() || !form.description.trim()) {
      setError('Le titre et la description sont obligatoires.');
      return;
    }
    setCreating(true);
    setMessage(''); setError('');
    try {
      await api.post('/projets', {
        titre: form.titre.trim(),
        description: form.description.trim(),
        budgetDemande: form.budgetDemande ? parseFloat(form.budgetDemande) : null,
      });
      setMessage('✅ Projet proposé avec succès !');
      setShowForm(false);
      setForm({ titre: '', description: '', budgetDemande: '' });
      fetchProjets();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const handleChangerStatut = async (projetId, statut) => {
    try {
      await api.patch(`/projets/${projetId}/statut?statut=${statut}`);
      setMessage(`✅ Statut mis à jour : ${statut}`);
      fetchProjets();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError('Erreur lors du changement de statut.');
    }
  };

  const projetsFiltres = projets.filter(p => {
    const matchRecherche = p.titre?.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = filtreStatut === 'TOUS' || p.statut === filtreStatut;
    return matchRecherche && matchStatut;
  });

  const renderProjet = ({ item }) => (
    <View style={[styles.card, { borderTopColor: statutColor(item.statut) }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titre}</Text>
        <View style={[styles.statutBadge, { backgroundColor: statutColor(item.statut) }]}>
          <Text style={styles.statutText}>{item.statut}</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
      )}

      <View style={styles.cardInfos}>
        {item.budgetDemande && (
          <Text style={styles.cardInfo}>💰 Budget : {item.budgetDemande} €</Text>
        )}
        {item.porteurPrenom && (
          <Text style={styles.cardInfo}>
            👤 Porteur : {item.porteurPrenom} {item.porteurNom}
          </Text>
        )}
        {item.dateCreation && (
          <Text style={styles.cardInfo}>
            📅 {new Date(item.dateCreation).toLocaleDateString('fr-BE')}
          </Text>
        )}
      </View>

      {/* Actions selon le rôle */}
      <View style={styles.cardActions}>
        {/* Admin → changer statut */}
        {peutGerer && item.statut === 'SOUMIS' && (
          <>
            <TouchableOpacity
              style={styles.btnApprouver}
              onPress={() => handleChangerStatut(item.id, 'APPROUVE')}
            >
              <Text style={styles.btnApprouverText}>✅ Approuver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnRejeter}
              onPress={() => handleChangerStatut(item.id, 'REJETE')}
            >
              <Text style={styles.btnRejeterText}>❌ Rejeter</Text>
            </TouchableOpacity>
          </>
        )}
        {peutGerer && item.statut === 'APPROUVE' && (
          <TouchableOpacity
            style={styles.btnEnCours}
            onPress={() => handleChangerStatut(item.id, 'EN_COURS')}
          >
            <Text style={styles.btnEnCoursText}>▶ Démarrer</Text>
          </TouchableOpacity>
        )}
        {peutGerer && item.statut === 'EN_COURS' && (
          <TouchableOpacity
            style={styles.btnTerminer}
            onPress={() => handleChangerStatut(item.id, 'TERMINE')}
          >
            <Text style={styles.btnTerminerText}>🏁 Terminer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Barre de recherche + bouton nouveau */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher un projet..."
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.btnNew}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.btnNewText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres statut */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtresScroll}
        contentContainerStyle={styles.filtresContent}
      >
        {STATUTS_FILTRES.map(s => (
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
      </ScrollView>

      {/* Bannière admin */}
      {peutGerer && (
        <View style={styles.adminBanner}>
          <Text style={styles.adminBannerText}>
            🛡️ Mode Admin — {projets.length} projet(s) au total
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
          <Text style={styles.loadingText}>Chargement des projets...</Text>
        </View>
      ) : projetsFiltres.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🚀</Text>
          <Text style={styles.emptyText}>
            {recherche ? 'Aucun projet trouvé.' : 'Aucun projet disponible.'}
          </Text>
          {isAuthenticated && (
            <TouchableOpacity onPress={() => setShowForm(true)}>
              <Text style={styles.emptyLink}>Proposer un projet →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={projetsFiltres}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProjet}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchProjets}
          refreshing={false}
        />
      )}

      {/* Modal formulaire nouveau projet */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚀 Proposer un projet</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Titre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Titre du projet"
                placeholderTextColor="#94a3b8"
                value={form.titre}
                onChangeText={(val) => setForm({ ...form, titre: val })}
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Décris ton projet en détail..."
                placeholderTextColor="#94a3b8"
                value={form.description}
                onChangeText={(val) => setForm({ ...form, description: val })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Budget demandé (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 500"
                placeholderTextColor="#94a3b8"
                value={form.budgetDemande}
                onChangeText={(val) => setForm({ ...form, budgetDemande: val })}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.btnCreate, creating && styles.btnDisabled]}
                onPress={handleProposer}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnCreateText}>Soumettre le projet</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
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
  btnNewText: { color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 28 },

  filtresScroll: {
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  filtresContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  filtreBtn: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  filtreBtnActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  filtreBtnText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  filtreBtnTextActive: { color: '#fff', fontWeight: '700' },

  adminBanner: {
    backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#bfdbfe',
  },
  adminBannerText: { fontSize: 12, color: '#1e40af', fontWeight: '600' },

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
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 14, borderTopWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  cardTitle: {
    flex: 1, fontSize: 15, fontWeight: 'bold',
    color: '#1e3a5f', lineHeight: 20, marginRight: 8,
  },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 10 },
  cardInfos: { marginBottom: 10 },
  cardInfo: { fontSize: 12, color: '#64748b', marginBottom: 3 },

  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnApprouver: {
    flex: 1, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac',
    paddingVertical: 8, borderRadius: 10, alignItems: 'center',
  },
  btnApprouverText: { color: '#16a34a', fontWeight: '600', fontSize: 12 },
  btnRejeter: {
    flex: 1, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
    paddingVertical: 8, borderRadius: 10, alignItems: 'center',
  },
  btnRejeterText: { color: '#dc2626', fontWeight: '600', fontSize: 12 },
  btnEnCours: {
    flex: 1, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd',
    paddingVertical: 8, borderRadius: 10, alignItems: 'center',
  },
  btnEnCoursText: { color: '#2563eb', fontWeight: '600', fontSize: 12 },
  btnTerminer: {
    flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1',
    paddingVertical: 8, borderRadius: 10, alignItems: 'center',
  },
  btnTerminerText: { color: '#475569', fontWeight: '600', fontSize: 12 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  emptyLink: { color: '#2563eb', fontSize: 13 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' },
  modalClose: { fontSize: 20, color: '#94a3b8', fontWeight: 'bold' },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14,
    color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 14,
  },
  inputMultiline: { height: 100, textAlignVertical: 'top' },
  btnCreate: {
    backgroundColor: '#1e3a5f', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnCreateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
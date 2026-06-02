import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ProjectsScreen() {
  const {
    isAuthenticated,
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
  } = useAuth();

  const [projets, setProjets] = useState([]);
  const [membreDashboard, setMembreDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    objectifs: '',
    budgetDemande: '',
  });

  useEffect(() => {
    chargerProjets();
  }, [isAuthenticated, isMembre, isReferent, isAdmin, isSuperAdmin]);

  const chargerProjets = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (isAdmin || isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      if (isReferent) {
        const res = await api.get('/projets/referent/mes-groupes');
        setProjets(res.data);
        setMembreDashboard(null);
        return;
      }

      const projetsRes = await api.get('/projets');
      setProjets(projetsRes.data);

      if (isMembre) {
        try {
          const dashboardRes = await api.get('/membre/dashboard');
          setMembreDashboard(dashboardRes.data);
        } catch {
          try {
            const groupeRes = await api.get('/messagerie/mon-groupe');
            setMembreDashboard({
              groupe: {
                ...groupeRes.data,
                statutAdhesion: 'ACCEPTE',
              },
            });
          } catch {
            setMembreDashboard(null);
          }
        }
      } else {
        setMembreDashboard(null);
      }
    } catch (err) {
      setError(getApiError(err, 'Impossible de charger les projets.'));
    } finally {
      setLoading(false);
    }
  };

  const handleProposer = async () => {
    if (!canProposeProject) {
      setError('Rejoins un groupe pour proposer un projet.');
      return;
    }
    if (!form.titre.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }

    setCreating(true);
    setError('');
    setMessage('');
    try {
      await api.post('/projets', {
        titre: form.titre.trim(),
        description: form.description.trim(),
        objectifs: form.objectifs.trim(),
        budgetDemande: form.budgetDemande ? parseFloat(form.budgetDemande) : null,
      });
      setMessage('Projet proposé avec succès.');
      setShowForm(false);
      setForm({ titre: '', description: '', objectifs: '', budgetDemande: '' });
      await chargerProjets();
    } catch (err) {
      setError(getApiError(err, 'Erreur lors de la proposition du projet.'));
    } finally {
      setCreating(false);
    }
  };

  const groupeActif = membreDashboard?.groupe?.statutAdhesion === 'ACCEPTE'
    ? membreDashboard.groupe
    : null;
  const canProposeProject = isMembre && !!groupeActif;

  const projetsFiltres = projets.filter((projet) => {
    const texte = `${projet.titre || ''} ${projet.description || ''} ${projet.groupeNom || ''}`;
    return texte.toLowerCase().includes(recherche.toLowerCase());
  });

  if (isAdmin) {
    return (
      <RoleBlockedState
        title="Projets"
        text="La gestion des projets se fait depuis le web."
      />
    );
  }

  if (isSuperAdmin) {
    return (
      <RoleBlockedState
        title="Projets métier"
        text="Le SUPER_ADMIN ne gère pas les projets de l’association sur mobile V1."
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un projet..."
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        {isMembre && (
          <TouchableOpacity
            style={[styles.btnNew, !canProposeProject && styles.btnNewDisabled]}
            onPress={() => canProposeProject ? setShowForm(true) : setError('Rejoins un groupe pour proposer un projet.')}
          >
            <Text style={styles.btnNewText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isAuthenticated && (
        <InfoBox text="Connecte-toi pour proposer un projet." />
      )}

      {isMembre && !canProposeProject && (
        <InfoBox text="Rejoins un groupe pour proposer un projet." />
      )}

      {isMembre && canProposeProject && (
        <InfoBox text={`Vous pouvez proposer un projet pour votre groupe : ${groupeActif.nom}.`} />
      )}

      {isReferent && (
        <InfoBox text="Mobile V1 affiche les projets de vos groupes en lecture simple. La validation se fait depuis le web admin." />
      )}

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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Chargement des projets...</Text>
        </View>
      ) : projetsFiltres.length === 0 ? (
        <EmptyState
          title={recherche ? 'Aucun projet trouvé' : 'Aucun projet disponible'}
          text={isReferent
            ? "Aucun projet n'est lié à vos groupes pour le moment."
            : "Les projets publics apparaîtront ici."}
          onRetry={chargerProjets}
        />
      ) : (
        <FlatList
          data={projetsFiltres}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ProjectCard projet={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={chargerProjets}
          refreshing={false}
        />
      )}

      <ProjectFormModal
        visible={showForm}
        form={form}
        setForm={setForm}
        creating={creating}
        onClose={() => setShowForm(false)}
        onSubmit={handleProposer}
        groupeNom={groupeActif?.nom}
      />
    </View>
  );
}

function ProjectCard({ projet }) {
  return (
    <View style={[styles.card, { borderTopColor: statusColor(projet.statut) }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>{projet.titre}</Text>
          <Text style={styles.cardSub}>{formatDate(projet.dateCreation)}</Text>
        </View>
        <StatusBadge label={translateProjetStatut(projet.statut)} color={statusColor(projet.statut)} />
      </View>

      {projet.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{projet.description}</Text>
      )}

      <View style={styles.metaBox}>
        {projet.groupeNom && <MetaRow label="Groupe" value={projet.groupeNom} />}
        <MetaRow
          label="Porteur"
          value={projet.porteurPrenom || projet.porteurNom
            ? `${projet.porteurPrenom || ''} ${projet.porteurNom || ''}`.trim()
            : 'Association'}
        />
        <MetaRow label="Budget" value={projet.budgetDemande ? `${projet.budgetDemande} €` : 'Non renseigné'} />
        <MetaRow label="Participants" value={`${projet.nombreParticipants ?? 0}`} />
        <MetaRow label="Commentaires" value={`${projet.nombreCommentaires ?? 0}`} />
      </View>
    </View>
  );
}

function ProjectFormModal({
  visible,
  form,
  setForm,
  creating,
  onClose,
  onSubmit,
  groupeNom,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Proposer un projet</Text>
              {groupeNom && <Text style={styles.modalSub}>Groupe : {groupeNom}</Text>}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
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

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Décris ton projet..."
              placeholderTextColor="#94a3b8"
              value={form.description}
              onChangeText={(val) => setForm({ ...form, description: val })}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Objectifs</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Quels sont les objectifs ?"
              placeholderTextColor="#94a3b8"
              value={form.objectifs}
              onChangeText={(val) => setForm({ ...form, objectifs: val })}
              multiline
              numberOfLines={3}
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
              onPress={onSubmit}
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
  );
}

function RoleBlockedState({ title, text }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>🚀</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function EmptyState({ title, text, onRetry }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>🚀</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoBox({ text }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoBoxText}>{text}</Text>
    </View>
  );
}

function StatusBadge({ label, color }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: color }]}>
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
}

function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function translateProjetStatut(statut) {
  switch (statut) {
    case 'BROUILLON': return 'Brouillon';
    case 'SOUMIS': return 'Soumis';
    case 'APPROUVE': return 'Approuvé';
    case 'EN_COURS': return 'En cours';
    case 'TERMINE': return 'Terminé';
    case 'REJETE': return 'Rejeté';
    default: return statut || 'Projet';
  }
}

function statusColor(statut) {
  switch (statut) {
    case 'APPROUVE': return '#16a34a';
    case 'EN_COURS': return '#2563eb';
    case 'TERMINE': return '#64748b';
    case 'REJETE': return '#dc2626';
    case 'SOUMIS': return '#0891b2';
    default: return '#d97706';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Date non renseignée';
  return new Date(dateStr).toLocaleDateString('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getApiError(err, fallback) {
  if (err.response?.status === 401) {
    return 'Session expirée. Reconnectez-vous.';
  }
  if (err.response?.status === 403) {
    return 'Accès non autorisé.';
  }
  return err.response?.data?.message || fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  btnNew: {
    width: 40,
    height: 40,
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNewDisabled: { backgroundColor: '#cbd5e1' },
  btnNewText: { color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 28 },

  infoBox: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
  },
  infoBoxText: { color: '#1e40af', fontSize: 13, lineHeight: 18 },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleWrap: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#1e3a5f', marginBottom: 4 },
  cardSub: { color: '#64748b', fontSize: 12 },
  cardDesc: { color: '#475569', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  metaBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  metaLabel: { color: '#64748b', fontSize: 12 },
  metaValue: {
    color: '#1e3a5f',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '58%',
    textAlign: 'right',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f0f4f8',
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 42, marginBottom: 12 },
  emptyTitle: {
    color: '#1e3a5f',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitle: { color: '#1e3a5f', fontSize: 18, fontWeight: '900' },
  modalSub: { color: '#64748b', fontSize: 12, marginTop: 3 },
  modalClose: { color: '#64748b', fontSize: 28, lineHeight: 30 },
  label: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  btnCreate: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  btnDisabled: { backgroundColor: '#cbd5e1' },
  btnCreateText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

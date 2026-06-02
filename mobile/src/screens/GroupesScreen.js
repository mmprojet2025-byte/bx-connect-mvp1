import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function GroupesScreen() {
  const {
    isAuthenticated,
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
  } = useAuth();

  const [groupes, setGroupes] = useState([]);
  const [adhesions, setAdhesions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    chargerGroupes();
  }, [isAuthenticated, isMembre, isReferent, isAdmin, isSuperAdmin]);

  const chargerGroupes = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (isAdmin || isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      if (isReferent) {
        const res = await api.get('/referent/groupes');
        setGroupes(res.data);
        setAdhesions([]);
      } else {
        const groupesRes = await api.get('/groupes');
        setGroupes(groupesRes.data);

        if (isMembre) {
          try {
            const adhesionsRes = await api.get('/groupes/mes-adhesions');
            setAdhesions(adhesionsRes.data);
          } catch {
            setAdhesions([]);
          }
        } else {
          setAdhesions([]);
        }
      }
    } catch (err) {
      setError(getApiError(err, 'Impossible de charger les groupes.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRejoindre = async (groupeId) => {
    if (!isMembre || hasActiveOrPendingAdhesion) return;

    setActionLoadingId(groupeId);
    setError('');
    setMessage('');
    try {
      await api.post(`/groupes/${groupeId}/rejoindre`);
      setMessage('Demande envoyée. Elle doit encore être acceptée.');
      await chargerGroupes();
    } catch (err) {
      setError(getApiError(err, "Impossible d'envoyer la demande d'adhésion."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuitter = async (groupeId) => {
    if (!isMembre) return;

    setActionLoadingId(groupeId);
    setError('');
    setMessage('');
    try {
      await api.delete(`/groupes/${groupeId}/quitter`);
      setMessage('Vous avez quitté le groupe.');
      await chargerGroupes();
    } catch (err) {
      setError(getApiError(err, 'Impossible de quitter ce groupe.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const adhesionAcceptee = adhesions.find((adhesion) => adhesion.statut === 'ACCEPTE') || null;
  const adhesionEnAttente = adhesions.find((adhesion) => adhesion.statut === 'EN_ATTENTE') || null;
  const hasActiveOrPendingAdhesion = !!adhesionAcceptee || !!adhesionEnAttente;

  const groupesFiltres = groupes.filter((groupe) => {
    const texte = `${groupe.nom || ''} ${groupe.description || ''} ${groupe.theme || ''}`;
    return texte.toLowerCase().includes(recherche.toLowerCase());
  });

  if (isAdmin) {
    return (
      <RoleBlockedState
        title="Groupes"
        text="La gestion des groupes se fait depuis le web."
      />
    );
  }

  if (isSuperAdmin) {
    return (
      <RoleBlockedState
        title="Groupes métier"
        text="Le SUPER_ADMIN ne gère pas les groupes de l’association sur mobile V1."
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un groupe..."
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        <TouchableOpacity style={styles.retrySmall} onPress={chargerGroupes}>
          <Text style={styles.retrySmallText}>Réessayer</Text>
        </TouchableOpacity>
      </View>

      {isMembre && (
        <MemberStatus
          adhesionAcceptee={adhesionAcceptee}
          adhesionEnAttente={adhesionEnAttente}
        />
      )}

      {!isAuthenticated && (
        <InfoBox text="Connecte-toi pour rejoindre un groupe." />
      )}

      {isReferent && (
        <InfoBox text="Vous voyez uniquement les groupes qui vous sont assignés. La gestion avancée se fait depuis l’espace web." />
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
          <Text style={styles.loadingText}>Chargement des groupes...</Text>
        </View>
      ) : groupesFiltres.length === 0 ? (
        <EmptyState
          title={recherche ? 'Aucun groupe trouvé' : 'Aucun groupe disponible'}
          text={isReferent
            ? "Aucun groupe ne vous est assigné pour le moment."
            : "Les groupes disponibles apparaîtront ici."}
          onRetry={chargerGroupes}
        />
      ) : (
        <FlatList
          data={groupesFiltres}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <GroupeCard
              groupe={item}
              isAuthenticated={isAuthenticated}
              isMembre={isMembre}
              isReferent={isReferent}
              adhesion={adhesions.find((a) => a.groupeId === item.id)}
              hasActiveOrPendingAdhesion={hasActiveOrPendingAdhesion}
              actionLoading={actionLoadingId === item.id}
              onRejoindre={() => handleRejoindre(item.id)}
              onQuitter={() => handleQuitter(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={chargerGroupes}
          refreshing={false}
        />
      )}
    </View>
  );
}

function MemberStatus({ adhesionAcceptee, adhesionEnAttente }) {
  let title = 'Aucun groupe';
  let text = 'Vous pouvez envoyer une demande pour rejoindre un groupe.';
  let color = '#2563eb';
  let bg = '#dbeafe';

  if (adhesionEnAttente) {
    title = 'Demande en attente';
    text = `Votre demande pour ${adhesionEnAttente.groupeNom} attend une validation.`;
    color = '#d97706';
    bg = '#fef3c7';
  }

  if (adhesionAcceptee) {
    title = 'Membre accepté';
    text = `Vous faites partie du groupe ${adhesionAcceptee.groupeNom}.`;
    color = '#16a34a';
    bg = '#dcfce7';
  }

  return (
    <View style={[styles.statusCard, { backgroundColor: bg, borderLeftColor: color }]}>
      <Text style={[styles.statusTitle, { color }]}>{title}</Text>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

function GroupeCard({
  groupe,
  isAuthenticated,
  isMembre,
  isReferent,
  adhesion,
  hasActiveOrPendingAdhesion,
  actionLoading,
  onRejoindre,
  onQuitter,
}) {
  const acceptedHere = adhesion?.statut === 'ACCEPTE';
  const pendingHere = adhesion?.statut === 'EN_ATTENTE';
  const refusedHere = adhesion?.statut === 'REFUSE';
  const canRequest = isMembre && !hasActiveOrPendingAdhesion;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>{groupe.nom}</Text>
          <Text style={styles.cardSub}>
            {groupe.nombreMembres ?? 0} membre{(groupe.nombreMembres ?? 0) > 1 ? 's' : ''}
          </Text>
        </View>
        <StatusBadge label={translateGroupeStatut(groupe.statut)} color={groupe.statut === 'VALIDE' ? '#16a34a' : '#d97706'} />
      </View>

      {groupe.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{groupe.description}</Text>
      )}

      <View style={styles.metaBox}>
        {groupe.theme && <MetaRow label="Thème" value={groupe.theme} />}
        {groupe.categorie && <MetaRow label="Catégorie" value={groupe.categorie} />}
        <MetaRow
          label="Référent"
          value={groupe.referentPrenom || groupe.referentNom
            ? `${groupe.referentPrenom || ''} ${groupe.referentNom || ''}`.trim()
            : 'Non assigné'}
        />
      </View>

      {isReferent && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Membres et demandes sont gérés depuis l’espace web référent pour Mobile V1.
          </Text>
        </View>
      )}

      {!isAuthenticated && (
        <Text style={styles.visitorHint}>Connecte-toi pour rejoindre un groupe.</Text>
      )}

      {isMembre && (
        <View style={styles.actions}>
          {acceptedHere && (
            <TouchableOpacity
              style={[styles.btnDanger, actionLoading && styles.btnDisabled]}
              onPress={onQuitter}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnDangerText}>Quitter le groupe</Text>
              }
            </TouchableOpacity>
          )}

          {pendingHere && (
            <StatusLine text="Demande en attente pour ce groupe." color="#d97706" />
          )}

          {refusedHere && !hasActiveOrPendingAdhesion && (
            <StatusLine text="Votre précédente demande a été refusée." color="#dc2626" />
          )}

          {!acceptedHere && !pendingHere && (
            <TouchableOpacity
              style={[styles.btnPrimary, (!canRequest || actionLoading) && styles.btnDisabled]}
              onPress={onRejoindre}
              disabled={!canRequest || actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnPrimaryText}>
                    {canRequest ? 'Demander à rejoindre' : 'Déjà inscrit dans un groupe'}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function RoleBlockedState({ title, text }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function EmptyState({ title, text, onRetry }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>👥</Text>
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

function StatusLine({ text, color }) {
  return <Text style={[styles.statusLine, { color }]}>{text}</Text>;
}

function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function translateGroupeStatut(statut) {
  switch (statut) {
    case 'VALIDE': return 'Validé';
    case 'EN_ATTENTE': return 'En attente';
    case 'REFUSE': return 'Refusé';
    default: return statut || 'Groupe';
  }
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
  retrySmall: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retrySmallText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },

  statusCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  statusTitle: { fontSize: 14, fontWeight: '900', marginBottom: 4 },
  statusText: { color: '#334155', fontSize: 13, lineHeight: 18 },

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
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#1e3a5f', marginBottom: 3 },
  cardSub: { color: '#64748b', fontSize: 12 },
  cardDesc: { color: '#475569', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  metaBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
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

  notice: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 2 },
  noticeText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  visitorHint: { color: '#2563eb', fontSize: 13, fontWeight: '700', marginTop: 4 },

  actions: { marginTop: 4 },
  btnPrimary: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  btnDanger: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDangerText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  btnDisabled: { backgroundColor: '#cbd5e1' },
  statusLine: { fontSize: 13, fontWeight: '800', marginTop: 2 },

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
});

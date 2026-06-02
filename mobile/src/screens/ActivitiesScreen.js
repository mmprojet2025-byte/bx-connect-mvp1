import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ActivitiesScreen() {
  const {
    isAuthenticated,
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
  } = useAuth();

  const [activites, setActivites] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    chargerActivites();
  }, [isAuthenticated, isMembre, isReferent, isAdmin, isSuperAdmin]);

  const chargerActivites = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (isAdmin || isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      if (isReferent) {
        const res = await api.get('/activites/mes-activites');
        setActivites(res.data);
        setInscriptions([]);
        return;
      }

      const activitesRes = await api.get('/activites');
      setActivites(activitesRes.data);

      if (isMembre) {
        try {
          const inscriptionsRes = await api.get('/inscriptions/mes-inscriptions');
          setInscriptions(inscriptionsRes.data);
        } catch {
          setInscriptions([]);
        }
      } else {
        setInscriptions([]);
      }
    } catch (err) {
      setError(getApiError(err, 'Impossible de charger les activités.'));
    } finally {
      setLoading(false);
    }
  };

  const handleInscrire = async (activiteId) => {
    if (!isMembre) return;

    setActionLoadingId(activiteId);
    setError('');
    setMessage('');
    try {
      await api.post('/inscriptions', { activiteId });
      setMessage('Inscription réussie.');
      await chargerActivites();
    } catch (err) {
      setError(getApiError(err, "Impossible de s'inscrire à cette activité."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const activitesFiltrees = activites.filter((activite) => {
    const texte = `${activite.titre || ''} ${activite.description || ''} ${activite.lieu || ''} ${activite.theme || ''}`;
    return texte.toLowerCase().includes(recherche.toLowerCase());
  });

  if (isAdmin) {
    return (
      <RoleBlockedState
        title="Activités"
        text="La gestion des activités se fait depuis le web."
      />
    );
  }

  if (isSuperAdmin) {
    return (
      <RoleBlockedState
        title="Activités métier"
        text="Le SUPER_ADMIN ne gère pas les activités de l’association sur mobile V1."
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une activité..."
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        <TouchableOpacity style={styles.retrySmall} onPress={chargerActivites}>
          <Text style={styles.retrySmallText}>Réessayer</Text>
        </TouchableOpacity>
      </View>

      {!isAuthenticated && (
        <InfoBox text="Connecte-toi pour t’inscrire à une activité." />
      )}

      {isReferent && (
        <InfoBox text="Mobile V1 affiche vos activités en lecture simple. La gestion complète se fait depuis le web." />
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
          <Text style={styles.loadingText}>Chargement des activités...</Text>
        </View>
      ) : activitesFiltrees.length === 0 ? (
        <EmptyState
          title={recherche ? 'Aucune activité trouvée' : 'Aucune activité disponible'}
          text={isReferent
            ? "Vos activités apparaîtront ici lorsqu'elles seront créées."
            : "Les activités publiées apparaîtront ici."}
          onRetry={chargerActivites}
        />
      ) : (
        <FlatList
          data={activitesFiltrees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ActivityCard
              activite={item}
              isAuthenticated={isAuthenticated}
              isMembre={isMembre}
              isReferent={isReferent}
              inscription={inscriptions.find((ins) => ins.activiteId === item.id)}
              actionLoading={actionLoadingId === item.id}
              onInscrire={() => handleInscrire(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={chargerActivites}
          refreshing={false}
        />
      )}
    </View>
  );
}

function ActivityCard({
  activite,
  isAuthenticated,
  isMembre,
  isReferent,
  inscription,
  actionLoading,
  onInscrire,
}) {
  const complete = isActiviteComplete(activite);
  const alreadyRegistered = !!inscription && inscription.statut !== 'ANNULEE';
  const canRegister = isMembre && activite.statut === 'PUBLIEE' && !alreadyRegistered && !complete;
  const status = getActivityStatus({ activite, inscription, complete });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>{activite.titre}</Text>
          <Text style={styles.cardSub}>{formatDateRange(activite.dateDebut, activite.dateFin)}</Text>
        </View>
        <StatusBadge label={status.label} color={status.color} />
      </View>

      {activite.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{activite.description}</Text>
      )}

      <View style={styles.metaBox}>
        <MetaRow label="Lieu" value={activite.lieu || 'À confirmer'} />
        <MetaRow label="Prix" value={activite.gratuite ? 'Gratuit' : `${activite.prix ?? 0} €`} />
        <MetaRow label="Capacité" value={formatCapacite(activite)} />
        {activite.theme && <MetaRow label="Thème" value={activite.theme} />}
        {isReferent && activite.createurPrenom && (
          <MetaRow
            label="Créée par"
            value={`${activite.createurPrenom || ''} ${activite.createurNom || ''}`.trim()}
          />
        )}
      </View>

      {!isAuthenticated && (
        <Text style={styles.visitorHint}>Connecte-toi pour t’inscrire.</Text>
      )}

      {isMembre && (
        <View style={styles.actions}>
          {alreadyRegistered ? (
            <StatusLine
              text={`Votre inscription : ${translateInscription(inscription.statut)}`}
              color={status.color}
            />
          ) : complete ? (
            <StatusLine text="Cette activité est complète." color="#dc2626" />
          ) : activite.statut !== 'PUBLIEE' ? (
            <StatusLine text="Inscription indisponible pour cette activité." color="#64748b" />
          ) : (
            <TouchableOpacity
              style={[styles.btnPrimary, (!canRegister || actionLoading) && styles.btnDisabled]}
              onPress={onInscrire}
              disabled={!canRegister || actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnPrimaryText}>{"S'inscrire"}</Text>
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
      <Text style={styles.emptyIcon}>🎯</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function EmptyState({ title, text, onRetry }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>🎯</Text>
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

function getActivityStatus({ activite, inscription, complete }) {
  if (inscription?.statut === 'CONFIRMEE') {
    return { label: 'Inscrit', color: '#16a34a' };
  }
  if (inscription?.statut === 'EN_ATTENTE_PAIEMENT') {
    return { label: 'Paiement en attente', color: '#d97706' };
  }
  if (inscription?.statut === 'ANNULEE') {
    return { label: 'Annulée', color: '#64748b' };
  }
  if (complete) {
    return { label: 'Complète', color: '#dc2626' };
  }
  if (activite.statut === 'PUBLIEE') {
    return { label: 'Disponible', color: '#2563eb' };
  }
  return { label: translateActiviteStatut(activite.statut), color: statusColor(activite.statut) };
}

function isActiviteComplete(activite) {
  if (typeof activite.complete === 'boolean') {
    return activite.complete;
  }
  const inscrits = activite.nombreInscrits ?? activite.inscrits ?? activite.nombreParticipants;
  return activite.capaciteMax > 0 && typeof inscrits === 'number' && inscrits >= activite.capaciteMax;
}

function formatCapacite(activite) {
  if (!activite.capaciteMax || activite.capaciteMax <= 0) {
    return 'Illimitée';
  }

  if (typeof activite.placesRestantes === 'number' && activite.placesRestantes >= 0) {
    return `${activite.placesRestantes} place${activite.placesRestantes > 1 ? 's' : ''} restante${activite.placesRestantes > 1 ? 's' : ''}`;
  }

  const inscrits = activite.nombreInscrits ?? activite.inscrits ?? activite.nombreParticipants;
  if (typeof inscrits === 'number') {
    const restantes = Math.max(activite.capaciteMax - inscrits, 0);
    return `${restantes} place${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}`;
  }

  return `${activite.capaciteMax} place${activite.capaciteMax > 1 ? 's' : ''} maximum`;
}

function translateInscription(statut) {
  switch (statut) {
    case 'CONFIRMEE': return 'Confirmée';
    case 'EN_ATTENTE_PAIEMENT': return 'Paiement en attente';
    case 'ANNULEE': return 'Annulée';
    default: return statut || 'Inconnue';
  }
}

function translateActiviteStatut(statut) {
  switch (statut) {
    case 'BROUILLON': return 'Brouillon';
    case 'PUBLIEE': return 'Disponible';
    case 'ANNULEE': return 'Annulée';
    case 'TERMINEE': return 'Terminée';
    default: return statut || 'Activité';
  }
}

function statusColor(statut) {
  switch (statut) {
    case 'PUBLIEE': return '#2563eb';
    case 'ANNULEE': return '#dc2626';
    case 'TERMINEE': return '#64748b';
    default: return '#d97706';
  }
}

function formatDateRange(dateDebut, dateFin) {
  if (!dateDebut) return 'Date à confirmer';
  const debut = new Date(dateDebut);
  const date = debut.toLocaleDateString('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const heureDebut = debut.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });

  if (!dateFin) return `${date} · ${heureDebut}`;

  const fin = new Date(dateFin);
  const heureFin = fin.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${heureDebut} - ${heureFin}`;
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

  visitorHint: { color: '#2563eb', fontSize: 13, fontWeight: '700', marginTop: 2 },
  actions: { marginTop: 2 },
  btnPrimary: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
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

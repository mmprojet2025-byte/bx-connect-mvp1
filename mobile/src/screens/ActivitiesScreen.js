import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ActivitiesScreen() {
  const { t, i18n } = useTranslation();
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
      setError(getApiError(err, t, t('activities.error_load')));
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
      setMessage(t('activities.success_register'));
      await chargerActivites();
    } catch (err) {
      setError(getApiError(err, t, t('activities.error_register_this')));
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
        title={t('activities.title')}
        text={t('activities.mobile_admin_web')}
      />
    );
  }

  if (isSuperAdmin) {
    return (
      <RoleBlockedState
        title={t('activities.business_activities')}
        text={t('activities.mobile_super_admin_no_access')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('activities.search_mobile')}
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        <TouchableOpacity style={styles.retrySmall} onPress={chargerActivites}>
          <Text style={styles.retrySmallText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>

      {!isAuthenticated && (
        <InfoBox text={t('activities.login_to_register_mobile')} />
      )}

      {isReferent && (
        <InfoBox text={t('activities.referent_mobile_info')} />
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
          <Text style={styles.loadingText}>{t('activities.loading')}</Text>
        </View>
      ) : activitesFiltrees.length === 0 ? (
        <EmptyState
          title={recherche ? t('activities.no_search_results') : t('activities.no_activities')}
          text={isReferent
            ? t('activities.no_referent_activities')
            : t('activities.empty_description')}
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
              t={t}
              language={i18n.language}
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
  t,
  language,
}) {
  const complete = isActiviteComplete(activite);
  const alreadyRegistered = !!inscription && inscription.statut !== 'ANNULEE';
  const canRegister = isMembre && activite.statut === 'PUBLIEE' && !alreadyRegistered && !complete;
  const status = getActivityStatus({ activite, inscription, complete }, t);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>{activite.titre}</Text>
          <Text style={styles.cardSub}>{formatDateRange(activite.dateDebut, activite.dateFin, language, t)}</Text>
        </View>
        <StatusBadge label={status.label} color={status.color} />
      </View>

      {activite.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{activite.description}</Text>
      )}

      <View style={styles.metaBox}>
        <MetaRow label={t('activities.form_place')} value={activite.lieu || t('activities.to_confirm')} />
        <MetaRow label={t('activities.price')} value={activite.gratuite ? t('activities.free') : t('activities.price_value', { price: activite.prix ?? 0 })} />
        <MetaRow label={t('activities.capacity')} value={formatCapacite(activite, t)} />
        {activite.theme && <MetaRow label={t('activities.form_theme')} value={activite.theme} />}
        {isReferent && activite.createurPrenom && (
          <MetaRow
            label={t('activities.created_by')}
            value={`${activite.createurPrenom || ''} ${activite.createurNom || ''}`.trim()}
          />
        )}
      </View>

      {!isAuthenticated && (
        <Text style={styles.visitorHint}>{t('activities.login_to_register_short')}</Text>
      )}

      {isMembre && (
        <View style={styles.actions}>
          {alreadyRegistered ? (
            <StatusLine
              text={t('activities.your_registration', { status: translateInscription(inscription.statut, t) })}
              color={status.color}
            />
          ) : complete ? (
            <StatusLine text={t('activities.full')} color="#dc2626" />
          ) : activite.statut !== 'PUBLIEE' ? (
            <StatusLine text={t('activities.registration_unavailable')} color="#64748b" />
          ) : (
            <TouchableOpacity
              style={[styles.btnPrimary, (!canRegister || actionLoading) && styles.btnDisabled]}
              onPress={onInscrire}
              disabled={!canRegister || actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnPrimaryText}>{t('activities.register_btn')}</Text>
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
  const { t } = useTranslation();
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>🎯</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
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

function getActivityStatus({ activite, inscription, complete }, t) {
  if (inscription?.statut === 'CONFIRMEE') {
    return { label: t('activities.registered'), color: '#16a34a' };
  }
  if (inscription?.statut === 'EN_ATTENTE_PAIEMENT') {
    return { label: t('statuses.EN_ATTENTE_PAIEMENT'), color: '#d97706' };
  }
  if (inscription?.statut === 'ANNULEE') {
    return { label: t('statuses.ANNULEE'), color: '#64748b' };
  }
  if (complete) {
    return { label: t('activities.full_status'), color: '#dc2626' };
  }
  if (activite.statut === 'PUBLIEE') {
    return { label: t('activities.available'), color: '#2563eb' };
  }
  return { label: translateActiviteStatut(activite.statut, t), color: statusColor(activite.statut) };
}

function isActiviteComplete(activite) {
  if (typeof activite.complete === 'boolean') {
    return activite.complete;
  }
  const inscrits = activite.nombreInscrits ?? activite.inscrits ?? activite.nombreParticipants;
  return activite.capaciteMax > 0 && typeof inscrits === 'number' && inscrits >= activite.capaciteMax;
}

function formatCapacite(activite, t) {
  if (!activite.capaciteMax || activite.capaciteMax <= 0) {
    return t('activities.unlimited_capacity');
  }

  if (typeof activite.placesRestantes === 'number' && activite.placesRestantes >= 0) {
    return t('activities.remaining_places', { count: activite.placesRestantes });
  }

  const inscrits = activite.nombreInscrits ?? activite.inscrits ?? activite.nombreParticipants;
  if (typeof inscrits === 'number') {
    const restantes = Math.max(activite.capaciteMax - inscrits, 0);
    return t('activities.remaining_places', { count: restantes });
  }

  return t('activities.max_places', { count: activite.capaciteMax });
}

function translateInscription(statut, t) {
  return t(`statuses.${statut}`, { defaultValue: statut || t('statuses.UNKNOWN') });
}

function translateActiviteStatut(statut, t) {
  return t(`statuses.${statut}`, { defaultValue: statut || t('activities.fallback_activity') });
}

function statusColor(statut) {
  switch (statut) {
    case 'PUBLIEE': return '#2563eb';
    case 'ANNULEE': return '#dc2626';
    case 'TERMINEE': return '#64748b';
    default: return '#d97706';
  }
}

function formatDateRange(dateDebut, dateFin, language, t) {
  if (!dateDebut) return t('activities.date_to_confirm');
  const debut = new Date(dateDebut);
  const date = debut.toLocaleDateString(language || 'fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const heureDebut = debut.toLocaleTimeString(language || 'fr-BE', { hour: '2-digit', minute: '2-digit' });

  if (!dateFin) return `${date} · ${heureDebut}`;

  const fin = new Date(dateFin);
  const heureFin = fin.toLocaleTimeString(language || 'fr-BE', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${heureDebut} - ${heureFin}`;
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) {
    return t('errors.session_expired');
  }
  if (err.response?.status === 403) {
    return t('errors.forbidden');
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

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ProjectsScreen() {
  const { t, i18n } = useTranslation();
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
      setError(getApiError(err, t, t('projects.error_load')));
    } finally {
      setLoading(false);
    }
  };

  const handleProposer = async () => {
    if (!canProposeProject) {
      setError(t('projects.needGroup'));
      return;
    }
    if (!form.titre.trim()) {
      setError(t('projects.error_title_required'));
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
      setMessage(t('projects.project_submitted_mobile'));
      setShowForm(false);
      setForm({ titre: '', description: '', objectifs: '', budgetDemande: '' });
      await chargerProjets();
    } catch (err) {
      setError(getApiError(err, t, t('projects.error_submit')));
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
        title={t('projects.title')}
        text={t('projects.mobile_admin_web')}
      />
    );
  }

  if (isSuperAdmin) {
    return (
      <RoleBlockedState
        title={t('projects.business_projects')}
        text={t('projects.mobile_super_admin_no_access')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('projects.search_mobile')}
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        {isMembre && (
          <TouchableOpacity
            style={[styles.btnNew, !canProposeProject && styles.btnNewDisabled]}
            onPress={() => canProposeProject ? setShowForm(true) : setError(t('projects.needGroup'))}
          >
            <Text style={styles.btnNewText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isAuthenticated && (
        <InfoBox text={t('projects.login_to_propose')} />
      )}

      {isMembre && !canProposeProject && (
        <InfoBox text={t('projects.needGroup')} />
      )}

      {isMembre && canProposeProject && (
        <InfoBox text={t('projects.can_propose_for_group', { group: groupeActif.nom })} />
      )}

      {isReferent && (
        <InfoBox text={t('projects.referent_mobile_info')} />
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
          <Text style={styles.loadingText}>{t('projects.loading')}</Text>
        </View>
      ) : projetsFiltres.length === 0 ? (
        <EmptyState
          title={recherche ? t('projects.no_search_results') : t('projects.no_projects')}
          text={isReferent
            ? t('projects.no_referent_projects')
            : t('projects.public_will_appear')}
          onRetry={chargerProjets}
        />
      ) : (
        <FlatList
          data={projetsFiltres}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ProjectCard projet={item} t={t} language={i18n.language} />}
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
        t={t}
      />
    </View>
  );
}

function ProjectCard({ projet, t, language }) {
  return (
    <View style={[styles.card, { borderTopColor: statusColor(projet.statut) }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>{projet.titre}</Text>
          <Text style={styles.cardSub}>{formatDate(projet.dateCreation, language, t)}</Text>
        </View>
        <StatusBadge label={translateProjetStatut(projet.statut, t)} color={statusColor(projet.statut)} />
      </View>

      {projet.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{projet.description}</Text>
      )}

      <View style={styles.metaBox}>
        {projet.groupeNom && <MetaRow label={t('groups.title')} value={projet.groupeNom} />}
        <MetaRow
          label={t('projects.owner')}
          value={projet.porteurPrenom || projet.porteurNom
            ? `${projet.porteurPrenom || ''} ${projet.porteurNom || ''}`.trim()
            : t('projects.association')}
        />
        <MetaRow label={t('projects.budget')} value={projet.budgetDemande ? `${projet.budgetDemande} €` : t('projects.not_provided')} />
        <MetaRow label={t('projects.participants')} value={`${projet.nombreParticipants ?? 0}`} />
        <MetaRow label={t('projects.comments')} value={`${projet.nombreCommentaires ?? 0}`} />
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
  t,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('projects.propose')}</Text>
              {groupeNom && <Text style={styles.modalSub}>{t('projects.group_label', { group: groupeNom })}</Text>}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{t('projects.form_title')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('projects.title_placeholder')}
              placeholderTextColor="#94a3b8"
              value={form.titre}
              onChangeText={(val) => setForm({ ...form, titre: val })}
            />

            <Text style={styles.label}>{t('projects.form_description_short')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder={t('projects.description_placeholder')}
              placeholderTextColor="#94a3b8"
              value={form.description}
              onChangeText={(val) => setForm({ ...form, description: val })}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>{t('projects.objectives')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder={t('projects.objectives_placeholder')}
              placeholderTextColor="#94a3b8"
              value={form.objectifs}
              onChangeText={(val) => setForm({ ...form, objectifs: val })}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>{t('projects.form_budget')}</Text>
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
                : <Text style={styles.btnCreateText}>{t('projects.submit_project')}</Text>
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
  const { t } = useTranslation();
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>🚀</Text>
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

function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function translateProjetStatut(statut, t) {
  return t(`statuses.${statut}`, { defaultValue: statut || t('projects.fallback_project') });
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

function formatDate(dateStr, language, t) {
  if (!dateStr) return t('projects.date_not_provided');
  return new Date(dateStr).toLocaleDateString(language || 'fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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

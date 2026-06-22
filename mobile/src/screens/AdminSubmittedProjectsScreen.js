import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader } from '../components/MobileUI';

export default function AdminSubmittedProjectsScreen() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProjects = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/projets/admin/soumis');
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.submittedProjectsLoadError', {
        defaultValue: 'Impossible de charger les projets soumis.',
      })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const confirmAction = (project, statut) => {
    const approved = statut === 'APPROUVE';
    Alert.alert(
      approved
        ? t('adminMobile.approveProject', { defaultValue: 'Valider le projet' })
        : t('adminMobile.rejectProject', { defaultValue: 'Refuser le projet' }),
      approved
        ? t('adminMobile.confirmApproveProject', { defaultValue: 'Ce projet sera approuvé.' })
        : t('adminMobile.confirmRejectProject', { defaultValue: 'Ce projet sera refusé.' }),
      [
        { text: t('common.cancel', { defaultValue: 'Annuler' }), style: 'cancel' },
        {
          text: approved ? t('adminMobile.validate', { defaultValue: 'Valider' }) : t('adminMobile.refuse', { defaultValue: 'Refuser' }),
          style: approved ? 'default' : 'destructive',
          onPress: () => processProject(project, statut),
        },
      ],
    );
  };

  const processProject = async (project, statut) => {
    setProcessingId(project.id);
    setMessage('');
    setError('');
    try {
      await api.patch(`/projets/${project.id}/statut?statut=${statut}`);
      setMessage(statut === 'APPROUVE'
        ? t('adminMobile.projectApproved', { defaultValue: 'Projet validé.' })
        : t('adminMobile.projectRejected', { defaultValue: 'Projet refusé.' }));
      await loadProjects();
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.projectProcessError', {
        defaultValue: 'Impossible de traiter ce projet.',
      })));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('common.loading', { defaultValue: 'Chargement...' })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('adminMobile.submittedProjects', { defaultValue: 'Projets soumis' })}
          subtitle={t('adminMobile.submittedProjectsSubtitle', {
            count: projects.length,
            defaultValue: `${projects.length} projet(s) à traiter`,
          })}
          icon="project"
        />
      </View>

      {message ? <InfoBox text={message} tone="success" /> : null}
      {error ? <InfoBox text={error} tone="danger" /> : null}

      {projects.length === 0 ? (
        <EmptyState
          icon="check"
          title={t('adminMobile.noSubmittedProjects', { defaultValue: 'Aucun projet soumis' })}
          text={t('adminMobile.noSubmittedProjectsText', { defaultValue: 'Les projets en attente de décision apparaîtront ici.' })}
          actionLabel={t('common.retry', { defaultValue: 'Réessayer' })}
          onAction={() => loadProjects()}
        />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              processing={processingId === item.id}
              onApprove={() => confirmAction(item, 'APPROUVE')}
              onReject={() => confirmAction(item, 'REJETE')}
              t={t}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProjects(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function ProjectCard({ project, processing, onApprove, onReject, t }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <AppIcon name="project" size={20} color={COLORS.impactOrange} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={2}>{project.titre || t('common.notAvailable', { defaultValue: 'Non renseigné' })}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{project.description || project.groupeNom || t('common.notAvailable', { defaultValue: 'Non renseigné' })}</Text>
        </View>
        <Badge label={formatStatus(project.statut, t)} color={COLORS.warning} soft />
      </View>

      <View style={styles.metaBox}>
        <Meta label={t('navigation.groups', { defaultValue: 'Groupe' })} value={project.groupeNom || '-'} />
        <Meta label={t('projects.carrier', { defaultValue: 'Porteur' })} value={ownerName(project, t)} />
        <Meta label={t('projects.budget', { defaultValue: 'Budget' })} value={`${project.budgetDemande || 0} €`} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.approveButton, processing && styles.disabled]} disabled={processing} onPress={onApprove}>
          <AppIcon name="check" size={16} color="#fff" />
          <Text style={styles.actionText}>{t('adminMobile.validate', { defaultValue: 'Valider' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.rejectButton, processing && styles.disabled]} disabled={processing} onPress={onReject}>
          <AppIcon name="close" size={16} color="#fff" />
          <Text style={styles.actionText}>{t('adminMobile.refuse', { defaultValue: 'Refuser' })}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value || '-'}</Text>
    </View>
  );
}

function InfoBox({ text, tone }) {
  const success = tone === 'success';
  return (
    <View style={[styles.infoBox, { borderLeftColor: success ? COLORS.success : COLORS.danger, backgroundColor: success ? '#f0fdf4' : '#fef2f2' }]}>
      <Text style={[styles.infoText, { color: success ? '#15803d' : COLORS.danger }]}>{text}</Text>
    </View>
  );
}

function ownerName(project, t) {
  const name = `${project.porteurPrenom || ''} ${project.porteurNom || ''}`.trim();
  return name || project.porteurEmail || t('common.notAvailable', { defaultValue: 'Non renseigné' });
}

function formatStatus(status, t) {
  return t(`statuses.${status}`, { defaultValue: String(status || '').replaceAll('_', ' ') || '-' });
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired', { defaultValue: 'Session expirée.' });
  if (err.response?.status === 403) return t('errors.forbidden', { defaultValue: 'Accès refusé.' });
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.page },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 14 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.softOrange, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, minWidth: 0 },
  title: { color: COLORS.bxBlue, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  rejectButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.danger, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  infoBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 10, borderLeftWidth: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
});

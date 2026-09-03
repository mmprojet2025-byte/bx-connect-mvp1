import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [commentDecision, setCommentDecision] = useState(null);
  const [comment, setComment] = useState('');

  const loadProjects = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/projets/admin/soumis');
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.submittedProjectsLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const confirmApprove = project => {
    Alert.alert(
      t('adminMobile.approveProject'),
      t('adminMobile.confirmApproveProject'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('adminMobile.validate'),
          onPress: () => processProject(project, 'APPROUVE', ''),
        },
      ],
    );
  };

  const openCommentDecision = (project, type) => {
    setComment('');
    setCommentDecision({ project, type });
  };

  const processProject = async (project, statut, decisionComment) => {
    setProcessingId(project.id);
    setMessage('');
    setError('');
    try {
      const url = statut === 'A_CORRIGER_ADMIN'
        ? `/projets/${project.id}/correction-admin`
        : `/projets/${project.id}/valider?approuver=${statut === 'APPROUVE'}`;
      await api.patch(url, decisionComment ? { texte: decisionComment } : undefined);
      setMessage(statut === 'APPROUVE' ? t('adminMobile.projectApproved')
        : statut === 'REJETE' ? t('adminMobile.projectRejected') : t('adminMobile.projectCorrectionRequested'));
      setCommentDecision(null);
      await loadProjects();
    } catch (err) {
      setError(getApiError(err, t, t('adminMobile.projectProcessError')));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('adminMobile.submittedProjects')}
          subtitle={t('adminMobile.submittedProjectsSubtitle',{
            count: projects.length})}
          icon="project"
        />
      </View>

      {message ? <InfoBox text={message} tone="success" /> : null}
      {error ? <InfoBox text={error} tone="danger" /> : null}

      {projects.length === 0 ? (
        <EmptyState
          icon="check"
          title={t('adminMobile.noSubmittedProjects')}
          text={t('adminMobile.noSubmittedProjectsText')}
          actionLabel={t('common.retry')}
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
              onApprove={() => confirmApprove(item)}
              onReject={() => openCommentDecision(item, 'REJETE')}
              onCorrection={() => openCommentDecision(item, 'A_CORRIGER_ADMIN')}
              t={t}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProjects(true)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Modal visible={Boolean(commentDecision)} transparent animationType="fade" onRequestClose={() => setCommentDecision(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{commentDecision?.type === 'REJETE' ? t('adminMobile.rejectProject') : t('adminMobile.requestProjectCorrection')}</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              multiline
              autoFocus
              maxLength={500}
              placeholder={t('adminMobile.projectDecisionCommentPlaceholder')}
              accessibilityLabel={t('adminMobile.projectDecisionCommentPlaceholder')}
              accessibilityHint={t('adminMobile.projectDecisionCommentHelp')}
            />
            <Text style={styles.commentCount}>{t('adminMobile.projectDecisionCharacterCount', { count: comment.length })}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCommentDecision(null)}><Text>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !comment.trim() && styles.disabled]}
                disabled={!comment.trim() || Boolean(processingId)}
                onPress={() => processProject(commentDecision.project, commentDecision.type, comment.trim())}
              ><Text style={styles.actionText}>{t('common.confirm')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProjectCard({ project, processing, onApprove, onReject, onCorrection, t }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <AppIcon name="project" size={20} color={COLORS.impactOrange} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={2}>{project.titre || t('common.notAvailable')}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{project.description || project.groupeNom || t('common.notAvailable')}</Text>
        </View>
        <Badge label={formatStatus(project.statut, t)} color={COLORS.warning} soft />
      </View>

      <View style={styles.metaBox}>
        <Meta label={t('navigation.groups')} value={project.groupeNom || '-'} />
        <Meta label={t('projects.carrier')} value={ownerName(project, t)} />
        <Meta label={t('projects.budget')} value={`${project.budgetDemande || 0} €`} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.approveButton, processing && styles.disabled]} disabled={processing} onPress={onApprove}>
          <AppIcon name="check" size={16} color="#fff" />
          <Text style={styles.actionText}>{t('adminMobile.validate')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.rejectButton, processing && styles.disabled]} disabled={processing} onPress={onReject}>
          <AppIcon name="close" size={16} color="#fff" />
          <Text style={styles.actionText}>{t('adminMobile.refuse')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.correctionButton, processing && styles.disabled]} disabled={processing} onPress={onCorrection}>
          <Text style={styles.correctionText}>{t('adminMobile.requestProjectCorrection')}</Text>
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
  return name || project.porteurEmail || t('common.notAvailable');
}

function formatStatus(status, t) {
  return t(`statuses.${status}`);
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  approveButton: { flexGrow: 1, flexBasis: 120, minHeight: 44, backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  rejectButton: { flexGrow: 1, flexBasis: 120, minHeight: 44, backgroundColor: COLORS.danger, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  correctionButton: { flexGrow: 1, flexBasis: '100%', minHeight: 44, backgroundColor: '#fef3c7', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  correctionText: { color: '#92400e', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  infoBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 10, borderLeftWidth: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 480, borderRadius: 18, backgroundColor: '#fff', padding: 18 },
  modalTitle: { color: COLORS.bxBlue, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  commentInput: { minHeight: 110, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, textAlignVertical: 'top', color: '#0f172a' },
  commentCount: { marginTop: 6, textAlign: 'right', color: COLORS.muted, fontSize: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  confirmButton: { minHeight: 44, justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.bxBlue, paddingHorizontal: 18 },
});

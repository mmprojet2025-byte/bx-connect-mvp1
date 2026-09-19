import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Image,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import {
  EmptyState as SharedEmptyState,
  ErrorState as SharedErrorState,
  LoadingState,
} from '../components/MobileUI';

export default function ProjectsScreen() {
  const { t, i18n } = useTranslation();
  const {
    isAuthenticated,
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
    isPartenaire,
  } = useAuth();

  const [projets, setProjets] = useState([]);
  const [groupesCreateur, setGroupesCreateur] = useState([]);
  const [membreDashboard, setMembreDashboard] = useState(null);
  const [memberGroupStatus, setMemberGroupStatus] = useState(isMembre ? 'loading' : 'idle');
  const [memberGroupError, setMemberGroupError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submittingProjectId, setSubmittingProjectId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    objectifs: '',
    budgetDemande: '',
    groupeId: '',
    justificationAdmin: '',
    visibilite: isAdmin ? 'PUBLIC' : 'GROUPE',
  });

  useEffect(() => {
    void Promise.resolve().then(() => chargerProjets());
  }, [isAuthenticated, isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire]);

  async function chargerProjets() {
    setLoading(true);
    setError('');

    if (isSuperAdmin) {
      setLoading(false);
      setMemberGroupStatus('idle');
      return;
    }

    const memberGroupRequest = isMembre ? chargerGroupeMembre() : Promise.resolve();

    try {
      if (isAdmin) {
        const [projetsRes, groupesRes, propresRes] = await Promise.all([
          api.get('/projets/admin/tous'),
          api.get('/admin/groupes'),
          api.get('/projets/mes-projets'),
        ]);
        setProjets(markOwnedProjects(projetsRes.data, propresRes.data));
        setGroupesCreateur(groupesRes.data || []);
        setMembreDashboard(null);
        setMemberGroupStatus('idle');
        return;
      }

      if (isPartenaire) {
        const res = await api.get('/partenaire/projets-ouverts');
        setProjets(res.data || []);
        setGroupesCreateur([]);
        setMembreDashboard(null);
        setMemberGroupStatus('idle');
        return;
      }

      if (isReferent) {
        const [projetsRes, groupesRes, propresRes] = await Promise.all([
          api.get('/projets/referent/mes-groupes'),
          api.get('/referent/groupes'),
          api.get('/projets/mes-projets'),
        ]);
        setProjets(markOwnedProjects(projetsRes.data, propresRes.data));
        setGroupesCreateur(groupesRes.data || []);
        setMembreDashboard(null);
        setMemberGroupStatus('idle');
        return;
      }

      if (isMembre) {
        const [projetsRes, mesProjetsRes] = await Promise.all([
          api.get('/projets'),
          api.get('/projets/mes-projets'),
        ]);
        setProjets(markOwnedProjects(mergeProjects(projetsRes.data, mesProjetsRes.data), mesProjetsRes.data));
      } else {
        const projetsRes = await api.get('/projets');
        setProjets(projetsRes.data || []);
      }
      setGroupesCreateur([]);

      if (!isMembre) {
        setMembreDashboard(null);
        setMemberGroupStatus('idle');
      }
    } catch (err) {
      setError(getApiError(err, t, t('projects.error_load')));
    } finally {
      setLoading(false);
      await memberGroupRequest;
    }
  }

  async function chargerGroupeMembre() {
    if (!isMembre) {
      setMembreDashboard(null);
      setMemberGroupStatus('idle');
      setMemberGroupError('');
      return;
    }

    setMemberGroupStatus('loading');
    setMemberGroupError('');
    try {
      const dashboardRes = await api.get('/membre/dashboard');
      setMembreDashboard(dashboardRes.data || {});
      setMemberGroupStatus('success');
      return;
    } catch {
      try {
        const groupeRes = await api.get('/messagerie/mon-groupe');
        setMembreDashboard({
          groupe: {
            ...groupeRes.data,
            statutAdhesion: 'ACCEPTE',
          },
        });
        setMemberGroupStatus('success');
        return;
      } catch (err) {
        setMembreDashboard(null);
        setMemberGroupStatus('error');
        setMemberGroupError(getApiError(err, t, t('projects.member_group_error')));
      }
    }
  }

  const handleProposer = async () => {
    if (!canProposeProject && !editingProject) {
      setError(isMembre ? t('projects.needGroup') : t('projects.creator_group_required'));
      return;
    }
    if (!form.titre.trim()) {
      setError(t('projects.error_title_required'));
      return;
    }
    if ((isReferent || (isAdmin && form.visibilite === 'GROUPE')) && !form.groupeId) {
      setError(t('projects.creator_group_required'));
      return;
    }

    setCreating(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        titre: form.titre.trim(),
        description: form.description.trim(),
        objectifs: form.objectifs.trim(),
        budgetDemande: form.budgetDemande ? parseFloat(form.budgetDemande) : null,
        groupeId: isMembre
          ? Number(groupeActif?.groupeId || groupeActif?.id)
          : (!form.groupeId ? null : Number(form.groupeId)),
        justificationAdmin: isAdmin && form.groupeId ? form.justificationAdmin.trim() : null,
        visibilite: form.visibilite,
      };

      if (editingProject) {
        const updateUrl = isReferent
          ? `/projets/referent/${editingProject.id}`
          : `/projets/${editingProject.id}`;
        await api.put(updateUrl, payload);
        setMessage(t('projects.project_updated_referent'));
        closeProjectFormAfterSave();
        await chargerProjets();
        return;
      }

      await api.post('/projets', payload);
      setMessage(t('projects.project_draft_created'));
      closeProjectFormAfterSave();
      await chargerProjets();
    } catch (err) {
      setError(getApiError(
        err,
        t,
        editingProject
          ? t('projects.error_update_referent')
          : t('projects.error_submit'),
      ));
    } finally {
      setCreating(false);
    }
  };

  const groupeActif = membreDashboard?.groupe?.statutAdhesion === 'ACCEPTE'
    ? membreDashboard.groupe
    : null;
  const canProposeProject = (isMembre && memberGroupStatus === 'success' && !!groupeActif)
    || (isReferent && groupesCreateur.length > 0)
    || isAdmin;
  const visibilityOptions = isAdmin
    ? ['GROUPE', 'COMMUNAUTE', 'PARTENAIRES', 'PUBLIC']
    : ['GROUPE', 'COMMUNAUTE'];
  const selectedGroup = groupesCreateur.find((groupe) => String(groupe.id) === String(form.groupeId));

  const openProjectForm = () => {
    setEditingProject(null);
    setError('');
    setMessage('');
    setForm((current) => ({
      ...current,
      groupeId: isReferent && !current.groupeId && groupesCreateur.length > 0
        ? String(groupesCreateur[0].id)
        : current.groupeId,
      visibilite: isAdmin ? (current.visibilite || 'PUBLIC') : 'GROUPE',
    }));
    setShowForm(true);
  };

  const openEditProjectForm = async (projet) => {
    let projectToEdit = projet;
    if (isAdmin) {
      try {
        const response = await api.get(`/projets/admin/${projet.id}`);
        projectToEdit = { ...response.data.projet, justificationAdmin: response.data.justificationAdmin };
      } catch (err) {
        setError(getApiError(err, t, t('projects.error_load')));
        return;
      }
    }
    setEditingProject(projectToEdit);
    setError('');
    setMessage('');
    setForm(projectToForm(projectToEdit, groupesCreateur, isAdmin));
    setShowForm(true);
  };

  const closeProjectForm = () => {
    if (creating) return;
    setShowForm(false);
    setEditingProject(null);
  };

  const closeProjectFormAfterSave = () => {
    setShowForm(false);
    setEditingProject(null);
    setForm({
      titre: '',
      description: '',
      objectifs: '',
      budgetDemande: '',
      groupeId: '',
      justificationAdmin: '',
      visibilite: isAdmin ? 'PUBLIC' : 'GROUPE',
    });
  };

  const projetsFiltres = projets.filter((projet) => {
    const texte = `${projet.titre || ''} ${projet.description || ''} ${projet.groupeNom || ''} ${projet.porteurPrenom || ''} ${projet.porteurNom || ''}`;
    return texte.toLowerCase().includes(recherche.toLowerCase());
  });

  const projectSections = [
    {
      key: 'owned',
      title: t('projects.my_projects_section'),
      data: projetsFiltres.filter((projet) => projet.estPorteurConnecte),
    },
    {
      key: 'community',
      title: t('projects.community_projects_section'),
      data: projetsFiltres.filter((projet) => !projet.estPorteurConnecte),
    },
  ].filter((section) => section.data.length > 0);

  const submitDraft = async projet => {
    setSubmittingProjectId(projet.id);
    setError('');
    setMessage('');
    try {
      const response = await api.patch(`/projets/${projet.id}/soumettre`);
      setMessage(t(`projects.submissionResult.${response.data.statut}`));
      await chargerProjets();
    } catch (err) {
      setError(getApiError(err, t, t('projects.error_submit')));
    } finally {
      setSubmittingProjectId(null);
    }
  };

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
        <View style={styles.searchField}>
          <AppIcon name="search" size={19} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('projects.search_mobile')}
            placeholderTextColor="#94A3B8"
            value={recherche}
            onChangeText={setRecherche}
            accessibilityLabel={t('projects.search_mobile')}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => void chargerProjets()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('projects.refresh')}
        >
          {loading
            ? <ActivityIndicator size="small" color="#2563EB" />
            : <AppIcon name="refresh" size={20} color="#2563EB" />}
        </TouchableOpacity>
      </View>

      {canProposeProject && (isMembre || isReferent || isAdmin) ? (
        <TouchableOpacity
          style={styles.btnNew}
          onPress={openProjectForm}
          accessibilityRole="button"
        >
          <AppIcon name="project" size={19} color="#FFFFFF" />
          <Text style={styles.btnNewText}>
            {isAdmin ? t('projects.create_project') : t('projects.propose')}
          </Text>
        </TouchableOpacity>
      ) : null}

      {!isAuthenticated && (
        <InfoBox text={t('projects.login_to_propose')} />
      )}

      {isMembre && memberGroupStatus === 'success' && !groupeActif && (
        <InfoBox text={t('projects.needGroup')} />
      )}

      {isMembre && memberGroupStatus === 'success' && groupeActif && (
        <InfoBox text={t('projects.can_propose_for_group', { group: groupeActif.nom })} />
      )}

      {isMembre && memberGroupStatus === 'loading' ? (
        <GroupDetectionState
          loading
          title={t('projects.member_group_loading')}
          text={t('projects.member_group_loading_text')}
        />
      ) : null}

      {isMembre && memberGroupStatus === 'error' ? (
        <GroupDetectionState
          title={t('projects.member_group_error_title')}
          text={memberGroupError}
          actionLabel={t('common.retry')}
          onAction={() => void chargerGroupeMembre()}
        />
      ) : null}

      {isReferent && (
        <InfoBox text={groupesCreateur.length > 0
          ? t('projects.referent_can_create')
          : t('projects.referent_no_group')} />
      )}

      {isAdmin && (
        <InfoBox text={t('projects.admin_can_create')} />
      )}

      {isPartenaire && (
        <InfoBox text={t('partner.projectsReadOnly')} />
      )}

      {message !== '' && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}

      {error !== '' && projets.length > 0 && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error !== '' && projets.length === 0 ? (
        <SharedErrorState
          title={t('common.loadErrorTitle')}
          text={error || t('common.loadErrorDescription')}
          retryLabel={t('common.retry')}
          onRetry={chargerProjets}
        />
      ) : projetsFiltres.length === 0 ? (
        <SharedEmptyState
          icon="project"
          illustrationSource={require('../assets/images/placeholders/projets.png')}
          title={recherche ? t('projects.no_search_results') : t('projects.no_projects')}
          text={isReferent
            ? t('projects.no_referent_projects')
            : t('projects.public_will_appear')}
          actionLabel={recherche ? undefined : t('common.retry')}
          onAction={recherche ? undefined : () => void chargerProjets()}
        />
      ) : (
        <SectionList
          sections={projectSections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: section.key === 'owned' ? '#F97316' : '#2563EB' }]} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ProjectCard
              projet={item}
              t={t}
              language={i18n.language}
              editable={item.estPorteurConnecte
                && ['BROUILLON', 'A_CORRIGER_REFERENT', 'A_CORRIGER_ADMIN'].includes(item.statut)
                && (!isReferent || canEditReferentProject(item, groupesCreateur))}
              onEdit={() => openEditProjectForm(item)}
              canSubmit={['BROUILLON', 'A_CORRIGER_REFERENT', 'A_CORRIGER_ADMIN'].includes(item.statut)
                && item.estPorteurConnecte}
              submitting={submittingProjectId === item.id}
              onSubmit={() => submitDraft(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => void chargerProjets()}
          refreshing={loading}
          stickySectionHeadersEnabled={false}
        />
      )}

      <ProjectFormModal
        visible={showForm}
        form={form}
        setForm={setForm}
        creating={creating}
        onClose={closeProjectForm}
        onSubmit={handleProposer}
        groupeNom={groupeActif?.nom || selectedGroup?.nom}
        groupes={groupesCreateur}
        requireGroup={isReferent || (isAdmin && form.visibilite === 'GROUPE')}
        allowNoGroup={isAdmin}
        visibilityOptions={visibilityOptions}
        submitLabel={editingProject
          ? isCorrectionProject(editingProject)
            ? t('projects.save_corrections')
            : t('common.save')
          : isAdmin ? t('projects.create_project') : t('projects.submit_project')}
        title={editingProject
          ? isCorrectionProject(editingProject)
            ? t('projects.correct_project')
            : t('projects.edit_project')
          : isAdmin ? t('projects.create_project') : t('projects.propose')}
        t={t}
      />
    </View>
  );
}

function ProjectCard({ projet, t, language, editable, onEdit, canSubmit, submitting, onSubmit }) {
  const needsCorrection = isCorrectionProject(projet);
  const owner = projectOwner(projet);
  return (
    <View style={[styles.card, needsCorrection && styles.correctionCard]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${statusColor(projet.statut)}18` }]}>
          <AppIcon name="project" size={20} color={statusColor(projet.statut)} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>{projet.titre}</Text>
          {projet.dateCreation ? <Text style={styles.cardSub}>{formatDate(projet.dateCreation, language, t)}</Text> : null}
        </View>
        <StatusBadge label={translateProjetStatut(projet.statut, t)} color={statusColor(projet.statut)} />
      </View>

      <Image
        source={require('../assets/images/placeholders/projets.png')}
        style={styles.projectImage}
        resizeMode="cover"
        accessibilityLabel={t('projects.placeholder_image')}
      />

      {projet.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{projet.description}</Text>
      )}

      {needsCorrection && projet.motifCorrection ? (
        <View style={styles.correctionBox} accessibilityRole="alert">
          <View style={styles.correctionHeader}>
            <AppIcon name="warning" size={18} color="#B45309" />
            <Text style={styles.correctionTitle}>{t('projects.correction_requested')}</Text>
          </View>
          <Text style={styles.correctionText}>{projet.motifCorrection}</Text>
        </View>
      ) : null}

      <View style={styles.projectBadges}>
        {projet.visibilite ? <VisibilityBadge visibility={projet.visibilite} t={t} /> : null}
        {projet.estPorteurConnecte ? (
          <View style={styles.ownerBadge}>
            <AppIcon name="profile" size={13} color="#F97316" />
            <Text style={styles.ownerBadgeText}>{t('projects.owned_by_me')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaBox}>
        {owner ? <MetaRow label={t('projects.owner')} value={owner} /> : null}
        {projet.groupeNom ? <MetaRow label={t('projects.group')} value={projet.groupeNom} /> : null}
        {projet.dateCreation ? <MetaRow label={t('projects.created_at')} value={formatDate(projet.dateCreation, language, t)} /> : null}
        {projet.budgetDemande != null ? <MetaRow label={t('projects.estimated_budget')} value={`${projet.budgetDemande} €`} /> : null}
        <MetaRow label={t('projects.participants')} value={`${projet.nombreParticipants ?? 0}`} />
        <MetaRow label={t('projects.comments')} value={`${projet.nombreCommentaires ?? 0}`} />
      </View>
      {editable || canSubmit ? (
        <View style={styles.cardActions}>
          {editable ? (
            <TouchableOpacity style={styles.editButton} onPress={onEdit} accessibilityRole="button">
              <AppIcon name="edit" size={17} color="#2563EB" />
              <Text style={styles.editButtonText}>{needsCorrection ? t('projects.correct') : t('common.edit')}</Text>
            </TouchableOpacity>
          ) : null}
          {canSubmit ? (
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.btnNewDisabled]}
              disabled={submitting}
              onPress={onSubmit}
              accessibilityRole="button"
              accessibilityLabel={needsCorrection ? t('projects.resubmit_project') : t('projects.submit_draft')}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <AppIcon name="send" size={17} color="#FFFFFF" />}
              <Text style={styles.submitButtonText}>
                {submitting
                  ? t('projects.submission_in_progress')
                  : needsCorrection ? t('projects.resubmit_project') : t('projects.submit_draft')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function projectOwner(projet) {
  if (projet.porteurPrenom || projet.porteurNom) {
    return `${projet.porteurPrenom || ''} ${projet.porteurNom || ''}`.trim();
  }
  return null;
}

function ProjectFormModal({
  visible,
  form,
  setForm,
  creating,
  onClose,
  onSubmit,
  groupeNom,
  groupes,
  requireGroup,
  allowNoGroup,
  visibilityOptions,
  submitLabel,
  title,
  t,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{title}</Text>
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
              placeholder={t('projects.budget_placeholder')}
              placeholderTextColor="#94a3b8"
              value={form.budgetDemande}
              onChangeText={(val) => setForm({ ...form, budgetDemande: val })}
              keyboardType="numeric"
            />

            {allowNoGroup && form.groupeId ? (
              <>
                <Text style={styles.label}>{t('projects.admin_group_justification')}</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={form.justificationAdmin}
                  onChangeText={(val) => setForm({ ...form, justificationAdmin: val })}
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                />
              </>
            ) : null}

            {groupes.length > 0 && (
              <>
                <Text style={styles.label}>
                  {requireGroup ? t('projects.group_required') : t('projects.group_optional')}
                </Text>
                <View style={styles.choiceOptions}>
                  {allowNoGroup && (
                    <ChoiceOption
                      selected={!form.groupeId}
                      label={t('projects.no_group')}
                      onPress={() => setForm({ ...form, groupeId: '' })}
                    />
                  )}
                  {groupes.map((groupe) => (
                    <ChoiceOption
                      key={groupe.id}
                      selected={String(form.groupeId) === String(groupe.id)}
                      label={groupe.nom}
                      onPress={() => setForm({ ...form, groupeId: String(groupe.id) })}
                    />
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>{t('projects.visibility')}</Text>
            <View style={styles.choiceOptions}>
              {visibilityOptions.map((visibility) => {
                const selected = form.visibilite === visibility;
                return (
                  <ChoiceOption
                    key={visibility}
                    selected={selected}
                    label={t(`projectVisibility.${visibility}`)}
                    onPress={() => setForm({ ...form, visibilite: visibility })}
                  />
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.btnCreate, creating && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnCreateText}>{submitLabel}</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChoiceOption({ selected, label, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.choiceOption, selected && styles.choiceOptionSelected]}
      onPress={onPress}
    >
      <Text
        style={[styles.choiceOptionText, selected && styles.choiceOptionTextSelected]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RoleBlockedState({ title, text }) {
  return (
    <View style={styles.centered}>
      <View style={styles.emptyIconCircle}>
        <AppIcon name="project" size={34} color="#38BDF8" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
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

function GroupDetectionState({ loading = false, title, text, actionLabel, onAction }) {
  return (
    <View style={[styles.groupDetection, !loading && styles.groupDetectionError]} accessibilityRole={loading ? 'progressbar' : 'alert'}>
      <View style={styles.groupDetectionHeader}>
        {loading
          ? <ActivityIndicator size="small" color="#2563EB" />
          : <AppIcon name="warning" size={20} color="#EF4444" />}
        <Text style={styles.groupDetectionTitle}>{title}</Text>
      </View>
      <Text style={styles.groupDetectionText}>{text}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.groupDetectionAction} onPress={onAction} accessibilityRole="button">
          <AppIcon name="refresh" size={17} color="#2563EB" />
          <Text style={styles.groupDetectionActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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

function VisibilityBadge({ visibility = 'GROUPE', t }) {
  const color = visibilityColor(visibility);
  return (
    <View style={[styles.visibilityBadge, { backgroundColor: `${color}18` }]}>
      <AppIcon name={visibility === 'PUBLIC' ? 'group' : 'project'} size={13} color={color} />
      <Text style={[styles.visibilityBadgeText, { color }]}>
        {t(`projectVisibility.${visibility || 'GROUPE'}`)}
      </Text>
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
  return t(`statuses.${statut}`);
}

function isCorrectionProject(projet) {
  return ['A_CORRIGER_REFERENT', 'A_CORRIGER_ADMIN'].includes(projet?.statut);
}

function statusColor(statut) {
  switch (statut) {
    case 'APPROUVE': return '#22C55E';
    case 'EN_COURS': return '#38BDF8';
    case 'TERMINE': return '#64748b';
    case 'REJETE': return '#EF4444';
    case 'REFUSE_REFERENT': return '#EF4444';
    case 'ANNULE': return '#64748b';
    case 'A_CORRIGER_REFERENT':
    case 'A_CORRIGER_ADMIN': return '#d97706';
    case 'SOUMIS': return '#0891b2';
    default: return '#d97706';
  }
}

function visibilityColor(visibility) {
  switch (visibility) {
    case 'PUBLIC': return '#059669';
    case 'PARTENAIRES': return '#F97316';
    case 'COMMUNAUTE': return '#2563EB';
    default: return '#64748b';
  }
}

function mergeProjects(...collections) {
  const projectsById = new Map();
  collections.flatMap((collection) => collection || []).forEach((project) => {
    projectsById.set(project.id, project);
  });
  return Array.from(projectsById.values());
}

function markOwnedProjects(projects, ownProjects) {
  const ownIds = new Set((ownProjects || []).map((project) => String(project.id)));
  return (projects || []).map((project) => ({
    ...project,
    estPorteurConnecte: ownIds.has(String(project.id)),
  }));
}

function projectToForm(projet, groupes, isAdmin) {
  const groupeId = projet.groupeId
    || groupes.find((groupe) => groupe.nom === projet.groupeNom)?.id
    || '';

  return {
    titre: projet.titre || '',
    description: projet.description || '',
    objectifs: projet.objectifs || '',
    budgetDemande: projet.budgetDemande != null ? String(projet.budgetDemande) : '',
    groupeId: groupeId ? String(groupeId) : '',
    justificationAdmin: projet.justificationAdmin || '',
    visibilite: projet.visibilite || (isAdmin ? 'PUBLIC' : 'GROUPE'),
  };
}

function canEditReferentProject(projet, groupes) {
  if (!projet || groupes.length === 0) return false;
  if (projet.groupeId && groupes.some((groupe) => String(groupe.id) === String(projet.groupeId))) {
    return true;
  }
  return groupes.some((groupe) => groupe.nom && groupe.nom === projet.groupeNom);
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
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  searchField: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNew: {
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    backgroundColor: '#F97316',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
  },
  btnNewDisabled: { backgroundColor: '#CBD5E1' },
  btnNewText: { color: '#FFFFFF', fontSize: 14, lineHeight: 19, fontWeight: '800' },

  infoBox: {
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
  },
  infoBoxText: { color: '#9A3412', fontSize: 13, lineHeight: 18 },
  groupDetection: {
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
  },
  groupDetectionError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  groupDetectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupDetectionTitle: { flex: 1, color: '#111827', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  groupDetectionText: { color: '#64748B', fontSize: 13, lineHeight: 18, marginTop: 6 },
  groupDetectionAction: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    marginTop: 4,
  },
  groupDetectionActionText: { color: '#2563EB', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

  listContent: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 16, paddingTop: 10, paddingBottom: 28 },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sectionTitle: { flex: 1, color: '#111827', fontSize: 17, lineHeight: 22, fontWeight: '700' },
  sectionCount: {
    minWidth: 26,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  correctionCard: { borderColor: '#F59E0B', backgroundColor: '#FFFEF8' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleWrap: { flex: 1, minWidth: 0, marginRight: 6 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2, lineHeight: 21 },
  cardSub: { color: '#64748B', fontSize: 12, lineHeight: 16 },
  projectImage: { width: '100%', aspectRatio: 16 / 7, borderRadius: 12, marginBottom: 10, backgroundColor: '#EFF6FF' },
  cardDesc: { color: '#475569', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  correctionBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 11, marginBottom: 10 },
  correctionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  correctionTitle: { flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  correctionText: { color: '#78350F', fontSize: 13, lineHeight: 18 },
  statusBadge: { maxWidth: 106, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 13, fontWeight: '800' },
  visibilityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  visibilityBadgeText: { fontSize: 10, lineHeight: 13, fontWeight: '800' },
  projectBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  ownerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFF7ED',
  },
  ownerBadgeText: { color: '#C2410C', fontSize: 10, lineHeight: 13, fontWeight: '800' },

  metaBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  metaLabel: { flexShrink: 0, color: '#64748B', fontSize: 12, lineHeight: 17, marginRight: 8 },
  metaValue: {
    color: '#1E3A8A',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    flexShrink: 1,
    maxWidth: '62%',
    textAlign: 'right',
  },
  editButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  editButtonText: { color: '#2563EB', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  submitButton: {
    flex: 1.25,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 42, marginBottom: 12 },
  emptyTitle: {
    color: '#1E3A8A',
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
    backgroundColor: '#1E3A8A',
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
  modalTitle: { color: '#1E3A8A', fontSize: 18, fontWeight: '900' },
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
  choiceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  choiceOption: {
    minWidth: '47%',
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
  },
  choiceOptionSelected: { backgroundColor: '#E0F2FE', borderColor: '#2563EB' },
  choiceOptionText: { color: '#64748b', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  choiceOptionTextSelected: { color: '#1E3A8A' },
  btnCreate: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  btnDisabled: { backgroundColor: '#cbd5e1' },
  btnCreateText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

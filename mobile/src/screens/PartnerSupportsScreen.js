import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { Badge, Card, COLORS, EmptyState, SectionHeader, StatCard } from '../components/MobileUI';

const SUPPORT_STATUS_EDITABLE = 'EN_ATTENTE';
const OPPORTUNITY_CATEGORIES = ['EMPLOI', 'STAGE', 'FORMATION', 'EVENEMENT', 'APPEL_PROJET', 'PUBLICITE'];
const EMPTY_OPPORTUNITY_FORM = {
  titre: '',
  descriptionCourte: '',
  contenu: '',
  categorieOpportunite: 'EMPLOI',
  lienExterne: '',
  dateExpiration: '',
};

export default function PartnerSupportsScreen({ route }) {
  const { t, i18n } = useTranslation();
  const [supports, setSupports] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [opportunityError, setOpportunityError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('supports');
  const [editingSupport, setEditingSupport] = useState(null);
  const [supportForm, setSupportForm] = useState({ montant: '', message: '' });
  const [savingSupport, setSavingSupport] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [opportunityForm, setOpportunityForm] = useState(EMPTY_OPPORTUNITY_FORM);
  const [savingOpportunity, setSavingOpportunity] = useState(false);

  useEffect(() => {
    chargerSoutiens();
    chargerOpportunites();
  }, []);

  useEffect(() => {
    if (route?.params?.tab === 'opportunities') {
      setActiveTab('opportunities');
    }
  }, [route?.params?.tab]);

  const chargerSoutiens = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    setMessage('');
    try {
      const [supportsRes, statsRes] = await Promise.all([
        api.get('/partenaire/mes-soutiens'),
        api.get('/partenaire/statistiques').catch(() => ({ data: null })),
      ]);
      setSupports(supportsRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      setError(getApiError(err, t, t('partner.supportsLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const chargerOpportunites = async () => {
    setOpportunitiesLoading(true);
    setOpportunityError('');
    try {
      const res = await api.get('/annonces/partenaire/mes-opportunites');
      setOpportunities(res.data || []);
    } catch (err) {
      setOpportunityError(getApiError(err, t, t('partner.opportunitiesLoadError', {
        defaultValue: 'Impossible de charger vos opportunités.',
      })));
    } finally {
      setOpportunitiesLoading(false);
    }
  };

  const openEditSupport = (support) => {
    setEditingSupport(support);
    setSupportForm({
      montant: String(support.montant ?? ''),
      message: support.message || '',
    });
    setError('');
    setMessage('');
  };

  const closeEditSupport = () => {
    if (savingSupport) return;
    setEditingSupport(null);
    setSupportForm({ montant: '', message: '' });
  };

  const saveSupport = async () => {
    if (!editingSupport) return;
    const montant = Number(String(supportForm.montant).replace(',', '.'));
    if (!montant || montant < 1) {
      setError(t('partner.supportAmountError', { defaultValue: 'Le montant minimum est de 1 €.' }));
      return;
    }

    setSavingSupport(true);
    setError('');
    setMessage('');
    try {
      await api.put(`/partenaire/mes-soutiens/${editingSupport.id}`, {
        montant,
        message: supportForm.message.trim(),
      });
      setMessage(t('partner.supportUpdated', { defaultValue: 'Votre soutien a été modifié.' }));
      closeEditSupportAfterSave();
      await chargerSoutiens();
    } catch (err) {
      setError(getApiError(err, t, t('partner.supportUpdateError', {
        defaultValue: 'Ce soutien n’est plus modifiable.',
      })));
    } finally {
      setSavingSupport(false);
    }
  };

  const closeEditSupportAfterSave = () => {
    setEditingSupport(null);
    setSupportForm({ montant: '', message: '' });
  };

  const confirmCancelSupport = (support) => {
    Alert.alert(
      t('partner.cancelSupport', { defaultValue: 'Annuler le soutien' }),
      t('partner.confirmCancelSupport', {
        defaultValue: 'Voulez-vous annuler cette proposition de soutien ?',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('partner.cancelSupport', { defaultValue: 'Annuler le soutien' }),
          style: 'destructive',
          onPress: () => cancelSupport(support),
        },
      ],
    );
  };

  const cancelSupport = async (support) => {
    setCancellingId(support.id);
    setError('');
    setMessage('');
    try {
      await api.patch(`/partenaire/mes-soutiens/${support.id}/annuler`);
      setMessage(t('partner.supportCancelled', { defaultValue: 'Votre soutien a été annulé.' }));
      await chargerSoutiens();
    } catch (err) {
      setError(getApiError(err, t, t('partner.supportCancelError', {
        defaultValue: 'Ce soutien ne peut plus être annulé.',
      })));
    } finally {
      setCancellingId(null);
    }
  };

  const openOpportunityForm = () => {
    setOpportunityForm(EMPTY_OPPORTUNITY_FORM);
    setOpportunityError('');
    setMessage('');
    setShowOpportunityForm(true);
  };

  const closeOpportunityForm = () => {
    if (savingOpportunity) return;
    setShowOpportunityForm(false);
    setOpportunityForm(EMPTY_OPPORTUNITY_FORM);
  };

  const createOpportunity = async () => {
    const validationError = validateOpportunityForm(opportunityForm, t);
    if (validationError) {
      setOpportunityError(validationError);
      return;
    }

    setSavingOpportunity(true);
    setOpportunityError('');
    setMessage('');
    try {
      await api.post('/annonces/opportunites', opportunityPayload(opportunityForm));
      setMessage(t('partner.opportunityCreated', {
        defaultValue: "Votre opportunité a été envoyée à l'administration pour validation.",
      }));
      setShowOpportunityForm(false);
      setOpportunityForm(EMPTY_OPPORTUNITY_FORM);
      await chargerOpportunites();
    } catch (err) {
      setOpportunityError(getApiError(err, t, t('partner.opportunityCreateError', {
        defaultValue: 'Impossible de créer cette opportunité.',
      })));
    } finally {
      setSavingOpportunity(false);
    }
  };

  const refreshCurrentTab = async () => {
    if (activeTab === 'supports') {
      await chargerSoutiens(true);
    } else {
      setRefreshing(true);
      await chargerOpportunites();
      setRefreshing(false);
    }
  };

  if (loading && activeTab === 'supports') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('partner.supportsLoading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title={t('partner.supportsAndOpportunities', { defaultValue: 'Soutiens & Opportunités' })}
          subtitle={t('partner.mobilePartnerSpaceSubtitle', {
            defaultValue: 'Deux espaces pour suivre vos soutiens et publier vos opportunités.',
          })}
          icon="wallet"
        />
        <View style={styles.segmented}>
          <SegmentButton
            active={activeTab === 'supports'}
            label={t('partner.supports', { defaultValue: 'Soutiens' })}
            onPress={() => setActiveTab('supports')}
          />
          <SegmentButton
            active={activeTab === 'opportunities'}
            label={t('partner.opportunities', { defaultValue: 'Opportunités' })}
            onPress={() => setActiveTab('opportunities')}
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard label={t('partner.totalSupports')} value={stats?.totalSoutiens ?? supports.length} icon="wallet" color={COLORS.impactOrange} />
          <StatCard label={t('partner.totalAmount')} value={`${stats?.totalMontant || 0} €`} icon="payment" color={COLORS.success} />
        </View>
      </View>

      {message ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      ) : null}

      {activeTab === 'supports' ? (
        <SupportsList
          supports={supports}
          loading={loading}
          error={error}
          refreshing={refreshing}
          t={t}
          language={i18n.language}
          onRefresh={refreshCurrentTab}
          onRetry={() => chargerSoutiens()}
          onEdit={openEditSupport}
          onCancel={confirmCancelSupport}
          cancellingId={cancellingId}
        />
      ) : (
        <OpportunitiesList
          opportunities={opportunities}
          loading={opportunitiesLoading}
          error={opportunityError}
          refreshing={refreshing}
          t={t}
          language={i18n.language}
          onRefresh={refreshCurrentTab}
          onRetry={chargerOpportunites}
          onCreate={openOpportunityForm}
        />
      )}

      <SupportEditModal
        visible={!!editingSupport}
        support={editingSupport}
        form={supportForm}
        setForm={setSupportForm}
        saving={savingSupport}
        onClose={closeEditSupport}
        onSubmit={saveSupport}
        t={t}
      />

      <OpportunityFormModal
        visible={showOpportunityForm}
        form={opportunityForm}
        setForm={setOpportunityForm}
        saving={savingOpportunity}
        onClose={closeOpportunityForm}
        onSubmit={createOpportunity}
        t={t}
      />
    </View>
  );
}

function SegmentButton({ active, label, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SupportsList({ supports, error, refreshing, t, language, onRefresh, onRetry, onEdit, onCancel, cancellingId }) {
  if (error) {
    return (
      <EmptyState
        icon="warning"
        title={t('common.error')}
        text={error}
        actionLabel={t('common.retry')}
        onAction={onRetry}
      />
    );
  }

  if (supports.length === 0) {
    return (
        <EmptyState
          icon="wallet"
          title={t('partner.noSupports', { defaultValue: 'Aucun soutien' })}
          text={t('partner.noSupportsText', {
            defaultValue: 'Vos propositions de soutien apparaîtront ici après envoi.',
          })}
          actionLabel={t('common.retry')}
          onAction={onRetry}
        />
    );
  }

  return (
    <FlatList
      data={supports}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <SupportCard
          support={item}
          t={t}
          language={language}
          onEdit={() => onEdit(item)}
          onCancel={() => onCancel(item)}
          cancelling={cancellingId === item.id}
        />
      )}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function SupportCard({ support, t, language, onEdit, onCancel, cancelling }) {
  const isProject = !!support.projetTitre;
  const title = support.projetTitre || support.activiteTitre || t('partner.supportFallback');
  const status = support.statutPaiement || support.statut || 'EN_ATTENTE';
  const editable = status === SUPPORT_STATUS_EDITABLE;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: isProject ? '#ffedd5' : '#E0F2FE' }]}>
          <AppIcon name={isProject ? 'project' : 'activity'} size={20} color={isProject ? COLORS.impactOrange : COLORS.info} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.subtitle}>{isProject ? t('navigation.projects') : t('navigation.activities')}</Text>
        </View>
        <Badge label={t(`partner.supportStatuses.${status}`, { defaultValue: status })} color={statusColor(status)} soft />
      </View>
      <View style={styles.metaBox}>
        <Meta label={t('partner.amount')} value={`${support.montant || 0} €`} />
        <Meta label={t('partner.date')} value={formatDate(support.dateCreation, language, t)} />
      </View>
      {support.message ? <Text style={styles.message} numberOfLines={2}>{support.message}</Text> : null}
      {editable ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onEdit}>
            <AppIcon name="edit" size={16} color={COLORS.bxBlueLight} />
            <Text style={styles.secondaryButtonText}>{t('common.edit', { defaultValue: 'Modifier' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={onCancel} disabled={cancelling}>
            {cancelling
              ? <ActivityIndicator size="small" color="#fff" />
              : <AppIcon name="close" size={16} color="#fff" />
            }
            <Text style={styles.dangerButtonText}>{t('common.cancel', { defaultValue: 'Annuler' })}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.unavailableHint}>
          {t('partner.supportActionUnavailable', {
            defaultValue: "Cette action n'est plus disponible car le soutien n'est plus en attente.",
          })}
        </Text>
      )}
    </Card>
  );
}

function OpportunitiesList({ opportunities, loading, error, refreshing, t, language, onRefresh, onRetry, onCreate }) {
  if (loading) {
    return (
      <View style={styles.centeredInline}>
        <ActivityIndicator size="large" color={COLORS.bxBlue} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={opportunities}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={(
        <TouchableOpacity style={styles.createOpportunityButton} onPress={onCreate}>
          <AppIcon name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.createOpportunityText}>
            {t('partner.createOpportunity', { defaultValue: 'Créer une opportunité' })}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={error ? (
        <EmptyState
          icon="warning"
          title={t('common.error')}
          text={error}
          actionLabel={t('common.retry')}
          onAction={onRetry}
        />
      ) : (
        <EmptyState
          icon="alert"
          title={t('partner.noOpportunities', { defaultValue: 'Aucune opportunité' })}
          text={t('partner.noOpportunitiesText', {
            defaultValue: 'Publiez une offre, un stage, une formation ou un appel à projet.',
          })}
        />
      )}
      renderItem={({ item }) => <OpportunityCard opportunity={item} t={t} language={language} />}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function OpportunityCard({ opportunity, t, language }) {
  const status = opportunity.statutModeration || 'EN_ATTENTE';
  const category = opportunity.categorieOpportunite || 'PUBLICITE';

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#fffbeb' }]}>
          <AppIcon name="alert" size={20} color={COLORS.warning} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={2}>{opportunity.titre}</Text>
          <Text style={styles.subtitle}>{formatCategory(category, t)}</Text>
        </View>
        <Badge label={formatStatus(status, t)} color={moderationColor(status)} soft />
      </View>
      {opportunity.descriptionCourte ? (
        <Text style={styles.message} numberOfLines={2}>{opportunity.descriptionCourte}</Text>
      ) : null}
      <View style={styles.metaBox}>
        <Meta label={t('partner.date', { defaultValue: 'Date' })} value={formatDate(opportunity.dateCreation, language, t)} />
        <Meta
          label={t('partner.expiration', { defaultValue: 'Expiration' })}
          value={formatDate(opportunity.dateExpiration, language, t)}
        />
      </View>
    </Card>
  );
}

function SupportEditModal({ visible, support, form, setForm, saving, onClose, onSubmit, t }) {
  const target = support
    ? support.projetTitre || support.activiteTitre || t('partner.supportFallback')
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('partner.editSupport', { defaultValue: 'Modifier le soutien' })}</Text>
          <Text style={styles.modalTarget} numberOfLines={2}>{target}</Text>
          <Text style={styles.inputLabel}>{t('partner.amount', { defaultValue: 'Montant' })}</Text>
          <TextInput
            value={form.montant}
            onChangeText={(value) => setForm((current) => ({ ...current, montant: value }))}
            keyboardType="decimal-pad"
            placeholder="100"
            style={styles.input}
          />
          <Text style={styles.inputLabel}>{t('partner.message', { defaultValue: 'Message' })}</Text>
          <TextInput
            value={form.message}
            onChangeText={(value) => setForm((current) => ({ ...current, message: value }))}
            multiline
            numberOfLines={4}
            placeholder={t('partner.messagePlaceholder', { defaultValue: 'Votre message...' })}
            style={[styles.input, styles.textArea]}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.modalCancelText}>{t('common.cancel', { defaultValue: 'Annuler' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSubmit, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>{t('common.save', { defaultValue: 'Enregistrer' })}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function OpportunityFormModal({ visible, form, setForm, saving, onClose, onSubmit, t }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fullModal}>
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{t('partner.createOpportunity', { defaultValue: 'Créer une opportunité' })}</Text>
          <Text style={styles.modalHint}>
            {t('partner.opportunityModerationHint', {
              defaultValue: "Elle sera envoyée à l'administration pour validation avant publication.",
            })}
          </Text>

          <Text style={styles.inputLabel}>{t('common.title', { defaultValue: 'Titre' })}</Text>
          <TextInput
            value={form.titre}
            onChangeText={(value) => setForm((current) => ({ ...current, titre: value }))}
            style={styles.input}
            placeholder={t('partner.opportunityTitlePlaceholder', { defaultValue: 'Titre de l’opportunité' })}
          />

          <Text style={styles.inputLabel}>{t('partner.shortDescription', { defaultValue: 'Description courte' })}</Text>
          <TextInput
            value={form.descriptionCourte}
            onChangeText={(value) => setForm((current) => ({ ...current, descriptionCourte: value }))}
            style={[styles.input, styles.textAreaSmall]}
            multiline
            maxLength={300}
            placeholder={t('partner.shortDescriptionPlaceholder', { defaultValue: 'Résumé visible dans les annonces' })}
          />

          <Text style={styles.inputLabel}>{t('common.content', { defaultValue: 'Contenu' })}</Text>
          <TextInput
            value={form.contenu}
            onChangeText={(value) => setForm((current) => ({ ...current, contenu: value }))}
            style={[styles.input, styles.textArea]}
            multiline
            placeholder={t('partner.opportunityContentPlaceholder', { defaultValue: 'Détail de l’offre ou de la publication' })}
          />

          <Text style={styles.inputLabel}>{t('partner.category', { defaultValue: 'Catégorie' })}</Text>
          <View style={styles.categoryGrid}>
            {OPPORTUNITY_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, form.categorieOpportunite === category && styles.categoryChipActive]}
                onPress={() => setForm((current) => ({ ...current, categorieOpportunite: category }))}
              >
                <Text style={[styles.categoryChipText, form.categorieOpportunite === category && styles.categoryChipTextActive]}>
                  {formatCategory(category, t)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>{t('partner.externalLink', { defaultValue: 'Lien externe' })}</Text>
          <TextInput
            value={form.lienExterne}
            onChangeText={(value) => setForm((current) => ({ ...current, lienExterne: value }))}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://..."
          />

          <Text style={styles.inputLabel}>{t('partner.expirationDate', { defaultValue: 'Date expiration' })}</Text>
          <TextInput
            value={form.dateExpiration}
            onChangeText={(value) => setForm((current) => ({ ...current, dateExpiration: value }))}
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.modalCancelText}>{t('common.cancel', { defaultValue: 'Annuler' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSubmit, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>{t('common.send', { defaultValue: 'Envoyer' })}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function formatDate(value, language, t) {
  if (!value) return t('common.notAvailable');
  return new Date(value).toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusColor(status) {
  if (status === 'PAYE' || status === 'VALIDE') return COLORS.success;
  if (status === 'REMBOURSE' || status === 'REFUSE') return COLORS.danger;
  if (status === 'ANNULE' || status === 'ANNULEE' || status === 'ECHOUE') return COLORS.muted;
  return COLORS.impactOrange;
}

function moderationColor(status) {
  if (status === 'PUBLIEE') return COLORS.success;
  if (status === 'REFUSEE') return COLORS.danger;
  return COLORS.warning;
}

function formatStatus(status, t) {
  return t(`partner.opportunityStatuses.${status}`, { defaultValue: String(status || '').replaceAll('_', ' ') });
}

function formatCategory(category, t) {
  return t(`partner.opportunityCategories.${category}`, { defaultValue: String(category || '').replaceAll('_', ' ') });
}

function validateOpportunityForm(form, t) {
  if (!form.titre.trim()) return t('partner.opportunityTitleRequired', { defaultValue: 'Le titre est obligatoire.' });
  if (!form.contenu.trim()) return t('partner.opportunityContentRequired', { defaultValue: 'Le contenu est obligatoire.' });
  if (!form.categorieOpportunite) return t('partner.opportunityCategoryRequired', { defaultValue: 'La catégorie est obligatoire.' });
  if (form.dateExpiration && !/^\d{4}-\d{2}-\d{2}$/.test(form.dateExpiration.trim())) {
    return t('partner.opportunityDateFormat', { defaultValue: 'La date doit être au format YYYY-MM-DD.' });
  }
  return '';
}

function opportunityPayload(form) {
  return {
    titre: form.titre.trim(),
    descriptionCourte: form.descriptionCourte.trim() || null,
    contenu: form.contenu.trim(),
    categorieOpportunite: form.categorieOpportunite,
    lienExterne: form.lienExterne.trim() || null,
    dateExpiration: form.dateExpiration.trim() ? `${form.dateExpiration.trim()}T23:59:59` : null,
  };
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
  segmented: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4, marginTop: 12, marginBottom: 12 },
  segmentButton: { flex: 1, minHeight: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentButtonActive: { backgroundColor: '#fff', shadowColor: '#111827', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  segmentText: { color: COLORS.muted, fontSize: 13, fontWeight: '800' },
  segmentTextActive: { color: COLORS.bxBlue },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  title: { color: COLORS.bxBlue, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  metaBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: COLORS.muted, fontSize: 11 },
  metaValue: { color: COLORS.bxBlue, fontSize: 11, fontWeight: '900', maxWidth: '58%', textAlign: 'right' },
  message: { color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 9 },
  successBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#f0fdf4', borderLeftWidth: 4, borderLeftColor: COLORS.success },
  successText: { color: '#15803d', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  unavailableHint: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: 9 },
  secondaryButton: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: '#eff6ff' },
  secondaryButtonText: { color: COLORS.bxBlueLight, fontSize: 13, fontWeight: '900' },
  dangerButton: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: COLORS.danger },
  dangerButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  centeredInline: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  createOpportunityButton: { minHeight: 46, borderRadius: 14, backgroundColor: COLORS.bxBlueLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  createOpportunityText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, gap: 8 },
  fullModal: { flex: 1, backgroundColor: COLORS.page },
  formContent: { padding: 18, paddingBottom: 34 },
  modalTitle: { color: COLORS.bxBlue, fontSize: 20, fontWeight: '900', lineHeight: 25 },
  modalHint: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 10 },
  modalTarget: { color: '#475569', fontSize: 13, lineHeight: 18, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginVertical: 6 },
  inputLabel: { color: COLORS.text, fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 5 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', paddingHorizontal: 12, color: COLORS.text, fontSize: 14 },
  textArea: { minHeight: 104, paddingTop: 11, textAlignVertical: 'top' },
  textAreaSmall: { minHeight: 76, paddingTop: 11, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: COLORS.muted, fontSize: 14, fontWeight: '900' },
  modalSubmit: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: COLORS.bxBlueLight, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#fff' },
  categoryChipActive: { backgroundColor: '#eff6ff', borderColor: COLORS.bxBlueLight },
  categoryChipText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  categoryChipTextActive: { color: COLORS.bxBlueLight },
});

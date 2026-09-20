import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { getReadOnlyCache, saveReadOnlyCache } from '../services/readOnlyCache';
import {
  EmptyState as SharedEmptyState,
  ErrorState as SharedErrorState,
  LoadingState,
} from '../components/MobileUI';

const ACTIVITY_STATUSES = ['BROUILLON', 'PUBLIEE', 'ANNULEE', 'TERMINEE'];
const EMPTY_FORM = {
  titre: '',
  description: '',
  lieu: '',
  date: '',
  heureDebut: '',
  heureFin: '',
  capaciteMax: '1',
  categorie: '',
  theme: '',
  gratuite: true,
  prix: '',
};
const PUBLIC_ACTIVITIES_CACHE_KEY = 'activities:public';

export default function ActivitiesScreen() {
  const { t, i18n } = useTranslation();
  const {
    isAuthenticated,
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
    isPartenaire,
  } = useAuth();

  const [activites, setActivites] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [inscriptionsStatus, setInscriptionsStatus] = useState('idle');
  const [inscriptionsError, setInscriptionsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cacheNotice, setCacheNotice] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    void Promise.resolve().then(() => chargerActivites());
  }, [isAuthenticated, isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire]);

  async function chargerActivites() {
    setLoading(true);
    setError('');
    setCacheNotice('');

    if (isSuperAdmin) {
      setInscriptionsStatus('idle');
      setLoading(false);
      return;
    }

    try {
      if (isAdmin) {
        const res = await api.get('/activites/admin/toutes');
        setActivites(res.data);
        setInscriptions([]);
        setInscriptionsStatus('idle');
        return;
      }

      if (isPartenaire) {
        const res = await api.get('/partenaire/activites-ouvertes');
        setActivites(res.data);
        setInscriptions([]);
        setInscriptionsStatus('idle');
        return;
      }

      if (isReferent) {
        const res = await api.get('/activites/mes-activites');
        setActivites(res.data);
        setInscriptions([]);
        setInscriptionsStatus('idle');
        return;
      }

      const activitesRes = await api.get('/activites', { skipAuth: true });
      const publicActivities = activitesRes.data || [];
      setActivites(publicActivities);
      await saveReadOnlyCache(PUBLIC_ACTIVITIES_CACHE_KEY, publicActivities);

      if (isMembre) {
        await chargerInscriptions();
      } else {
        setInscriptions([]);
        setInscriptionsStatus('idle');
        setInscriptionsError('');
      }
    } catch (err) {
      const canUsePublicCache = !isAdmin && !isReferent && !isPartenaire && !isSuperAdmin
        && err.response?.status !== 403;
      const cachedActivities = canUsePublicCache
        ? await getReadOnlyCache(PUBLIC_ACTIVITIES_CACHE_KEY)
        : null;

      if (cachedActivities?.length) {
        setActivites(cachedActivities);
        if (isMembre) {
          setInscriptionsStatus('error');
          setInscriptionsError(t('activities.registrations_unknown_text'));
        } else {
          setInscriptions([]);
          setInscriptionsStatus('idle');
        }
        setCacheNotice(t('common.cache_notice'));
        setError('');
        return;
      }

      if (isMembre && err.response?.status === 403) {
        setActivites([]);
        setError('');
      } else {
        setError(getApiError(err, t, t('activities.error_load')));
      }
    } finally {
      setLoading(false);
    }
  }

  async function chargerInscriptions() {
    if (!isMembre) return;

    setInscriptionsStatus('loading');
    setInscriptionsError('');
    try {
      const inscriptionsRes = await api.get('/inscriptions/mes-inscriptions');
      setInscriptions(inscriptionsRes.data || []);
      setInscriptionsStatus('success');
    } catch (err) {
      setInscriptionsError(getApiError(err, t, t('activities.registrations_error')));
      setInscriptionsStatus('error');
    }
  }

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

  const confirmAnnulerInscription = (inscription) => {
    Alert.alert(
      t('activities.cancel_registration'),
      t('activities.confirm_cancel_registration'),
      [
        { text: t('buttons.cancel'), style: 'cancel' },
        {
          text: t('activities.cancel_registration'),
          style: 'destructive',
          onPress: () => handleAnnulerInscription(inscription),
        },
      ],
    );
  };

  const handleAnnulerInscription = async (inscription) => {
    setActionLoadingId(inscription.activiteId);
    setError('');
    setMessage('');
    try {
      await api.delete(`/inscriptions/${inscription.id}`);
      setMessage(t('activities.registration_cancelled'));
      await chargerActivites();
    } catch (err) {
      setError(getApiError(err, t, t('activities.error_cancel_registration')));
    } finally {
      setActionLoadingId(null);
    }
  };

  const openCreateForm = () => {
    setEditingActivity(null);
    setForm(EMPTY_FORM);
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const openEditForm = (activite) => {
    setEditingActivity(activite);
    setForm(activityToForm(activite));
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingActivity(null);
    setForm(EMPTY_FORM);
  };

  const handleSaveActivity = async () => {
    const validationError = validateActivityForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = activityPayload(form);
      if (editingActivity) {
        await api.put(`/activites/${editingActivity.id}`, payload);
        setMessage(t('activities.activity_updated'));
      } else {
        await api.post('/activites', payload);
        setMessage(t('activities.activity_created'));
      }
      closeFormAfterSave();
      await chargerActivites();
    } catch (err) {
      setError(getApiError(
        err,
        t,
        editingActivity ? t('activities.error_update') : t('activities.error_create'),
      ));
    } finally {
      setSaving(false);
    }
  };

  const closeFormAfterSave = () => {
    setShowForm(false);
    setEditingActivity(null);
    setForm(EMPTY_FORM);
  };

  const confirmStatusChange = (activite, statut) => {
    if (activite.statut === statut) return;
    Alert.alert(
      t('activities.change_status'),
      t('activities.confirm_status_change',{
        status: t(`statuses.${statut}`, { defaultValue: statut })}),
      [
        { text: t('buttons.cancel'), style: 'cancel' },
        {
          text: t('buttons.confirm'),
          onPress: () => handleStatusChange(activite.id, statut),
        },
      ],
    );
  };

  const handleStatusChange = async (activiteId, statut) => {
    setActionLoadingId(activiteId);
    setError('');
    setMessage('');
    try {
      await api.patch(`/activites/${activiteId}/statut?statut=${statut}`);
      setMessage(t('activities.status_updated'));
      await chargerActivites();
    } catch (err) {
      setError(getApiError(err, t, t('activities.error_status_change')));
    } finally {
      setActionLoadingId(null);
    }
  };

  const activitesFiltrees = activites.filter((activite) => {
    const texte = `${activite.titre || ''} ${activite.description || ''} ${activite.lieu || ''} ${activite.theme || ''}`;
    return texte.toLowerCase().includes(recherche.toLowerCase());
  });

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
        <View style={styles.searchField}>
          <AppIcon name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('activities.search_mobile')}
            placeholderTextColor="#94A3B8"
            value={recherche}
            onChangeText={setRecherche}
            accessibilityLabel={t('activities.search_mobile')}
          />
        </View>
        {(isReferent || isAdmin) ? (
          <TouchableOpacity
            style={styles.newButton}
            onPress={openCreateForm}
            accessibilityRole="button"
            accessibilityLabel={t('activities.new_activity')}
          >
            <AppIcon name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.newButtonText}>{t('activities.new_short')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.retrySmall}
            onPress={chargerActivites}
            accessibilityRole="button"
            accessibilityLabel={t('activities.refresh_accessibility')}
          >
            <AppIcon name="refresh" size={20} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>

      {!isAuthenticated && (
        <InfoBox text={t('activities.login_to_register_mobile')} />
      )}

      {isReferent && (
        <InfoBox text={t('activities.referent_manage_info')} />
      )}

      {isAdmin && (
        <InfoBox text={t('activities.admin_manage_info')} />
      )}

      {isPartenaire && (
        <InfoBox text={t('partner.activitiesReadOnly')} />
      )}

      {cacheNotice !== '' && (
        <InfoBox text={cacheNotice} />
      )}

      {isMembre && !loading && inscriptionsStatus === 'loading' && (
        <InfoBox text={t('activities.registrations_loading')} />
      )}

      {isMembre && !loading && inscriptionsStatus === 'error' && (
        <View style={styles.registrationErrorBox} accessibilityRole="alert">
          <View style={styles.registrationErrorTextBlock}>
            <Text style={styles.registrationErrorTitle}>
              {t('activities.registrations_unknown_title')}
            </Text>
            <Text style={styles.registrationErrorText}>
              {inscriptionsError || t('activities.registrations_unknown_text')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.registrationRetryButton}
            onPress={chargerInscriptions}
            accessibilityRole="button"
            accessibilityLabel={t('activities.retry_registrations')}
          >
            <AppIcon name="refresh" size={17} color="#1D4ED8" />
            <Text style={styles.registrationRetryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {message !== '' && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}

      {error !== '' && activites.length > 0 && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error !== '' && activites.length === 0 ? (
        <SharedErrorState
          title={t('common.loadErrorTitle')}
          text={error || t('common.loadErrorDescription')}
          retryLabel={t('common.retry')}
          onRetry={chargerActivites}
        />
      ) : activitesFiltrees.length === 0 ? (
        <SharedEmptyState
          icon="activity"
          illustrationSource={require('../assets/images/placeholders/activites.png')}
          title={recherche ? t('activities.no_search_results') : t('activities.no_activities')}
          text={isReferent
            ? t('activities.no_referent_activities')
            : t('activities.empty_description')}
          actionLabel={t('common.retry')}
          onAction={chargerActivites}
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
              isAdmin={isAdmin}
              isPartenaire={isPartenaire}
              inscription={inscriptionsStatus === 'success'
                ? inscriptions.find((ins) => ins.activiteId === item.id)
                : undefined}
              actionLoading={actionLoadingId === item.id}
              onInscrire={() => handleInscrire(item.id)}
              onAnnulerInscription={() => confirmAnnulerInscription(
                inscriptionsStatus === 'success'
                  ? inscriptions.find((ins) => ins.activiteId === item.id)
                  : undefined,
              )}
              onEdit={() => openEditForm(item)}
              onStatusChange={(statut) => confirmStatusChange(item, statut)}
              t={t}
              language={i18n.language}
              readOnly={cacheNotice !== '' || (isMembre && inscriptionsStatus !== 'success')}
              readOnlyText={cacheNotice !== ''
                ? t('common.cache_read_only')
                : t('activities.registrations_unknown_action')}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={chargerActivites}
          refreshing={false}
        />
      )}

      <ActivityFormModal
        visible={showForm}
        form={form}
        setForm={setForm}
        editing={editingActivity}
        saving={saving}
        onClose={closeForm}
        onSubmit={handleSaveActivity}
        t={t}
      />
    </View>
  );
}

function ActivityCard({
  activite,
  isAuthenticated,
  isMembre,
  isReferent,
  isAdmin,
  isPartenaire,
  inscription,
  actionLoading,
  onInscrire,
  onAnnulerInscription,
  onEdit,
  onStatusChange,
  t,
  language,
  readOnly,
  readOnlyText,
}) {
  const complete = isActiviteComplete(activite);
  const alreadyRegistered = !!inscription && inscription.statut !== 'ANNULEE';
  const canRegister = !readOnly && isMembre && activite.gratuite === true
    && activite.statut === 'PUBLIEE' && !alreadyRegistered && !complete;
  const status = getActivityStatus({ activite, inscription, complete }, t);
  const itineraryUrl = buildMapsUrl({
    latitude: activite.latitude,
    longitude: activite.longitude,
    addressParts: [activite.adresse, activite.commune, activite.lieu],
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryWrap}>
          <View style={[styles.cardIcon, { backgroundColor: `${status.color}18` }]}>
            <AppIcon name="activity" size={19} color={status.color} />
          </View>
          {activite.categorie ? (
            <Text style={styles.categoryText} numberOfLines={1}>{activite.categorie}</Text>
          ) : null}
        </View>
        <StatusBadge label={status.label} color={status.color} />
      </View>

      <Text style={styles.cardTitle}>{activite.titre}</Text>

      <View style={styles.dateRow}>
        <AppIcon name="calendar-outline" size={18} color="#2563EB" />
        <Text style={styles.cardSub}>
          {formatDateRange(activite.dateDebut, activite.dateFin, language, t)}
        </Text>
      </View>

      {activite.description ? (
        <Text style={styles.cardDesc}>{activite.description}</Text>
      ) : null}

      <View style={styles.chipList}>
        {activite.gratuite === true ? (
          <InfoChip icon="gift-outline" text={t('activities.free')} tone="green" />
        ) : null}
        {hasCapacityData(activite) ? (
          <InfoChip icon="group" text={formatCapacite(activite, t)} />
        ) : null}
        {activite.theme && <InfoChip icon="pricetag-outline" text={activite.theme} />}
        {(isReferent || isAdmin) && activite.createurPrenom && (
          <InfoChip
            icon="profile"
            text={`${activite.createurPrenom || ''} ${activite.createurNom || ''}`.trim()}
          />
        )}
        {isPartenaire && <InfoChip icon="shield" text={t('partner.support')} />}
      </View>

      {(activite.commune || activite.lieu || itineraryUrl) ? (
        <View style={styles.locationBlock}>
          <View style={styles.locationTextBlock}>
            {activite.commune ? (
              <LocationLine icon="map-outline" text={activite.commune} />
            ) : null}
            {activite.lieu ? (
              <LocationLine icon="location-outline" text={activite.lieu} />
            ) : null}
          </View>
          {itineraryUrl ? (
            <TouchableOpacity
              style={styles.itineraryButton}
              onPress={() => openItinerary(itineraryUrl, t)}
              accessibilityRole="link"
              accessibilityLabel={t('geo.viewItinerary')}
            >
              <Text style={styles.itineraryButtonText}>{t('geo.viewItinerary')}</Text>
              <AppIcon name="open-outline" size={15} color="#2563EB" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {!isAuthenticated && (
        <Text style={styles.visitorHint}>{t('activities.login_to_register_short')}</Text>
      )}

      {isMembre && (
        <View style={styles.actions}>
          {alreadyRegistered ? (
            <View style={styles.registeredBlock}>
              <View style={styles.registeredStatus}>
                <AppIcon name="checkmark-circle" size={20} color="#16A34A" />
                <StatusLine
                  text={t('activities.your_registration', { status: translateInscription(inscription.statut, t) })}
                  color="#15803D"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.cancelRegistrationButton,
                  (readOnly || actionLoading) && styles.actionDisabled,
                ]}
                onPress={onAnnulerInscription}
                disabled={readOnly || actionLoading}
                accessibilityRole="button"
              >
                {actionLoading ? (
                  <ActivityIndicator color="#EF4444" size="small" />
                ) : (
                  <>
                    <AppIcon name="close-circle-outline" size={18} color="#EF4444" />
                    <Text style={styles.cancelRegistrationText}>{t('activities.cancel_short')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : readOnly ? (
            <StatusLine text={readOnlyText} color="#64748b" />
          ) : activite.gratuite === false ? (
            <DisabledAction
              icon="ban-outline"
              text={t('activities.paid_registration_unavailable')}
              color="#D97706"
            />
          ) : complete ? (
            <DisabledAction icon="ban-outline" text={t('activities.full')} color="#EF4444" />
          ) : activite.statut !== 'PUBLIEE' ? (
            <DisabledAction
              icon="lock-closed-outline"
              text={t('activities.registration_unavailable')}
              color="#64748B"
            />
          ) : (
            <TouchableOpacity
              style={[styles.btnPrimary, (!canRegister || actionLoading) && styles.btnDisabled]}
              onPress={onInscrire}
              disabled={!canRegister || actionLoading}
              accessibilityRole="button"
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : (
                  <>
                    <AppIcon name="person-add-outline" size={19} color="#fff" />
                    <Text style={styles.btnPrimaryText}>{t('activities.register_btn')}</Text>
                  </>
                )
              }
            </TouchableOpacity>
          )}
        </View>
      )}

      {(isReferent || isAdmin) && (
        <View style={styles.managementBlock}>
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <AppIcon name="edit" size={15} color="#1E3A8A" />
            <Text style={styles.editButtonText}>{t('activities.edit')}</Text>
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusOptions}
          >
            {ACTIVITY_STATUSES.map((statut) => (
              <TouchableOpacity
                key={statut}
                style={[
                  styles.statusOption,
                  activite.statut === statut && styles.statusOptionActive,
                ]}
                onPress={() => onStatusChange(statut)}
                disabled={actionLoading}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    activite.statut === statut && styles.statusOptionTextActive,
                  ]}
                >
                  {t(`statuses.${statut}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function ActivityFormModal({
  visible,
  form,
  setForm,
  editing,
  saving,
  onClose,
  onSubmit,
  t,
}) {
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleBlock}>
              <Text style={styles.modalTitle}>
                {editing ? t('activities.edit_activity') : t('activities.new_activity')}
              </Text>
              <Text style={styles.modalSubtitle}>{t('activities.form_mobile_hint')}</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <AppIcon name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
          >
            <FormInput
              label={t('activities.form_title')}
              value={form.titre}
              onChangeText={(value) => update('titre', value)}
              placeholder={t('activities.title_placeholder')}
            />
            <FormInput
              label={t('activities.form_description')}
              value={form.description}
              onChangeText={(value) => update('description', value)}
              placeholder={t('activities.description_placeholder')}
              multiline
            />
            <FormInput
              label={t('activities.form_place')}
              value={form.lieu}
              onChangeText={(value) => update('lieu', value)}
              placeholder={t('activities.place_placeholder')}
            />

            <View style={styles.formRow}>
              <FormInput
                style={styles.formHalf}
                label={t('activities.date')}
                value={form.date}
                onChangeText={(value) => update('date', value)}
                placeholder={t('activities.date_placeholder')}
                keyboardType="numbers-and-punctuation"
              />
              <FormInput
                style={styles.formHalf}
                label={t('activities.start_time')}
                value={form.heureDebut}
                onChangeText={(value) => update('heureDebut', value)}
                placeholder={t('activities.start_time_placeholder')}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.formRow}>
              <FormInput
                style={styles.formHalf}
                label={t('activities.end_time')}
                value={form.heureFin}
                onChangeText={(value) => update('heureFin', value)}
                placeholder={t('activities.end_time_placeholder')}
                keyboardType="numbers-and-punctuation"
              />
              <FormInput
                style={styles.formHalf}
                label={t('activities.form_capacity')}
                value={form.capaciteMax}
                onChangeText={(value) => update('capaciteMax', value)}
                placeholder={t('activities.capacity_placeholder')}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formRow}>
              <FormInput
                style={styles.formHalf}
                label={t('activities.form_category')}
                value={form.categorie}
                onChangeText={(value) => update('categorie', value)}
                placeholder={t('activities.category_placeholder')}
              />
              <FormInput
                style={styles.formHalf}
                label={t('activities.form_theme')}
                value={form.theme}
                onChangeText={(value) => update('theme', value)}
                placeholder={t('activities.theme_placeholder')}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <AppIcon name={editing ? 'save' : 'add-circle-outline'} size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {editing ? t('activities.save_changes') : t('activities.create_btn')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FormInput({ label, style, multiline = false, ...props }) {
  return (
    <View style={style}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.formInput, multiline && styles.formInputMultiline]}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function RoleBlockedState({ title, text }) {
  return (
    <View style={styles.centered}>
      <View style={styles.emptyIconCircle}>
        <AppIcon name="activity" size={34} color="#38BDF8" />
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

function StatusBadge({ label, color }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function StatusLine({ text, color }) {
  return <Text style={[styles.statusLine, { color }]}>{text}</Text>;
}

function DisabledAction({ icon, text, color }) {
  return (
    <View style={styles.disabledAction} accessibilityState={{ disabled: true }}>
      <AppIcon name={icon} size={18} color={color} />
      <Text style={[styles.disabledActionText, { color }]}>{text}</Text>
    </View>
  );
}

function InfoChip({ icon, text, tone = 'blue' }) {
  const green = tone === 'green';
  return (
    <View style={[styles.infoChip, green && styles.infoChipGreen]}>
      <AppIcon name={icon} size={15} color={green ? '#16A34A' : '#1E3A8A'} />
      <Text style={[styles.infoChipText, green && styles.infoChipTextGreen]}>{text}</Text>
    </View>
  );
}

function LocationLine({ icon, text }) {
  return (
    <View style={styles.locationLine}>
      <AppIcon name={icon} size={17} color="#64748B" />
      <Text style={styles.locationText}>{text}</Text>
    </View>
  );
}

function activityToForm(activite) {
  const debut = splitDateTime(activite.dateDebut);
  const fin = splitDateTime(activite.dateFin);
  return {
    titre: activite.titre || '',
    description: activite.description || '',
    lieu: activite.lieu || '',
    date: debut.date,
    heureDebut: debut.time,
    heureFin: fin.time,
    capaciteMax: String(activite.capaciteMax ?? ''),
    categorie: activite.categorie || '',
    theme: activite.theme || '',
    gratuite: activite.gratuite ?? true,
    prix: activite.prix == null ? '' : String(activite.prix),
  };
}

function splitDateTime(value) {
  if (!value) return { date: '', time: '' };
  const [date, rawTime = ''] = String(value).split('T');
  return { date, time: rawTime.slice(0, 5) };
}

function validateActivityForm(form, t) {
  if (!form.titre.trim()) return t('activities.error_title_required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return t('activities.error_date_format');
  if (!/^\d{2}:\d{2}$/.test(form.heureDebut) || !/^\d{2}:\d{2}$/.test(form.heureFin)) {
    return t('activities.error_time_format');
  }

  const debut = new Date(`${form.date}T${form.heureDebut}:00`);
  const fin = new Date(`${form.date}T${form.heureFin}:00`);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin <= debut) {
    return t('activities.error_end_after_start');
  }
  if (!form.capaciteMax || Number(form.capaciteMax) <= 0) {
    return t('activities.error_capacity_positive');
  }
  if (!form.gratuite && (!form.prix || Number(form.prix) < 0)) {
    return t('activities.error_price_required');
  }
  return '';
}

function activityPayload(form) {
  return {
    titre: form.titre.trim(),
    description: form.description.trim(),
    lieu: form.lieu.trim(),
    dateDebut: `${form.date}T${form.heureDebut}:00`,
    dateFin: `${form.date}T${form.heureFin}:00`,
    capaciteMax: Number(form.capaciteMax) || 0,
    categorie: form.categorie.trim(),
    theme: form.theme.trim(),
    gratuite: form.gratuite,
    prix: form.gratuite ? null : Number(form.prix),
  };
}

function getActivityStatus({ activite, inscription, complete }, t) {
  if (inscription?.statut === 'CONFIRMEE') {
    return { label: t('activities.registered'), color: '#22C55E' };
  }
  if (inscription?.statut === 'EN_ATTENTE_PAIEMENT') {
    return { label: t('statuses.EN_ATTENTE_PAIEMENT'), color: '#d97706' };
  }
  if (inscription?.statut === 'ANNULEE') {
    return { label: t('statuses.ANNULEE'), color: '#64748b' };
  }
  if (complete) {
    return { label: t('activities.full_status'), color: '#EF4444' };
  }
  if (activite.statut === 'PUBLIEE') {
    return { label: t('activities.available'), color: '#38BDF8' };
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

function hasCapacityData(activite) {
  return typeof activite.capaciteMax === 'number'
    || typeof activite.placesRestantes === 'number'
    || typeof activite.nombreInscrits === 'number'
    || typeof activite.inscrits === 'number'
    || typeof activite.nombreParticipants === 'number';
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
  return t(`statuses.${statut}`);
}

function translateActiviteStatut(statut, t) {
  return t(`statuses.${statut}`);
}

function statusColor(statut) {
  switch (statut) {
    case 'PUBLIEE': return '#38BDF8';
    case 'ANNULEE': return '#EF4444';
    case 'TERMINEE': return '#64748b';
    default: return '#d97706';
  }
}

function formatDateRange(dateDebut, dateFin, language, t) {
  if (!dateDebut) return t('activities.date_to_confirm');
  const debut = new Date(dateDebut);
  const locale = language === 'nl' ? 'nl-BE' : language === 'en' ? 'en-GB' : 'fr-BE';
  const date = debut.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const heureDebut = debut.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  if (!dateFin) return `${date} · ${heureDebut}`;

  const fin = new Date(dateFin);
  const heureFin = fin.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${heureDebut} - ${heureFin}`;
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

function buildMapsUrl({ latitude, longitude, addressParts }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }

  const query = (addressParts || [])
    .filter((part) => part && String(part).trim())
    .join(' ');

  return query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : null;
}

async function openItinerary(url, t) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      t('geo.openErrorTitle'),
      t('geo.openErrorText'),
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  searchContainer: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  searchField: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  retrySmall: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  retrySmallText: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },
  newButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  newButtonText: { color: '#fff', fontSize: 12, lineHeight: 16, fontWeight: '700' },

  infoBox: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
    width: '92%',
    maxWidth: 428,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  infoBoxText: { color: '#1e40af', fontSize: 12, lineHeight: 16 },
  registrationErrorBox: {
    width: '92%',
    maxWidth: 428,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  registrationErrorTextBlock: { flex: 1, minWidth: 0 },
  registrationErrorTitle: { color: '#991B1B', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  registrationErrorText: { color: '#7F1D1D', fontSize: 12, lineHeight: 17, marginTop: 2 },
  registrationRetryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
  },
  registrationRetryText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    marginHorizontal: 16,
    maxWidth: 428,
    width: '92%',
    alignSelf: 'center',
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginHorizontal: 16,
    maxWidth: 428,
    width: '92%',
    alignSelf: 'center',
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

  listContent: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryText: { flex: 1, color: '#64748B', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  cardTitle: { color: '#111827', fontSize: 17, lineHeight: 22, fontWeight: '700', marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 12 },
  cardSub: { flex: 1, color: '#334155', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  cardDesc: { color: '#64748B', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  statusBadge: { maxWidth: '45%', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusBadgeText: { fontSize: 10, lineHeight: 13, fontWeight: '700', textAlign: 'center' },

  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  infoChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  infoChipGreen: { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' },
  infoChipText: { color: '#334155', fontSize: 11, lineHeight: 15, fontWeight: '600', flexShrink: 1 },
  infoChipTextGreen: { color: '#15803D' },
  locationBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  locationTextBlock: { flex: 1, minWidth: 0, gap: 5 },
  locationLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  locationText: { flex: 1, color: '#475569', fontSize: 12, lineHeight: 17 },
  itineraryButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  itineraryButtonText: { color: '#2563EB', fontSize: 12, lineHeight: 16, fontWeight: '700' },

  visitorHint: { color: '#2563EB', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 14 },
  actions: { marginTop: 14 },
  btnPrimary: {
    minHeight: 48,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  btnDisabled: { backgroundColor: '#CBD5E1' },
  statusLine: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  registeredBlock: { gap: 10 },
  registeredStatus: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelRegistrationButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
  },
  cancelRegistrationText: { color: '#EF4444', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  actionDisabled: { opacity: 0.55 },
  disabledAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  disabledActionText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  managementBlock: {
    marginTop: 6,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  editButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  editButtonText: { color: '#1E3A8A', fontSize: 11, fontWeight: '900' },
  statusOptions: { gap: 6, paddingRight: 4 },
  statusOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusOptionActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  statusOptionText: { color: '#64748b', fontSize: 9, fontWeight: '900' },
  statusOptionTextActive: { color: '#fff' },

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
    backgroundColor: 'rgba(15,23,42,0.48)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitleBlock: { flex: 1, paddingRight: 12 },
  modalTitle: { color: '#1E3A8A', fontSize: 19, lineHeight: 24, fontWeight: '900' },
  modalSubtitle: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 2 },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: { paddingBottom: 28 },
  formLabel: { color: '#334155', fontSize: 12, fontWeight: '800', marginBottom: 5 },
  formInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 13,
    marginBottom: 10,
  },
  formInputMultiline: { minHeight: 76 },
  formRow: { flexDirection: 'row', gap: 8 },
  formHalf: { flex: 1, minWidth: 0 },
  saveButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 4,
  },
  saveButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView
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

const ACTIVITY_STATUSES = ['BROUILLON', 'PUBLIEE', 'ANNULEE', 'TERMINEE'];
const EMPTY_FORM = {
  titre: '',
  description: '',
  lieu: '',
  date: '',
  heureDebut: '',
  heureFin: '',
  capaciteMax: '',
  categorie: '',
  theme: '',
  gratuite: true,
  prix: '',
};

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
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    chargerActivites();
  }, [isAuthenticated, isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire]);

  const chargerActivites = async () => {
    setLoading(true);
    setError('');

    if (isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      if (isAdmin) {
        const res = await api.get('/activites/admin/toutes');
        setActivites(res.data);
        setInscriptions([]);
        return;
      }

      if (isPartenaire) {
        const res = await api.get('/partenaire/activites-ouvertes');
        setActivites(res.data);
        setInscriptions([]);
        return;
      }

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
      t('activities.confirm_status_change', {
        status: t(`statuses.${statut}`, { defaultValue: statut }),
      }),
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
        <TextInput
          style={styles.searchInput}
          placeholder={t('activities.search_mobile')}
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        {(isReferent || isAdmin) ? (
          <TouchableOpacity style={styles.newButton} onPress={openCreateForm}>
            <AppIcon name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.newButtonText}>{t('activities.new_short')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.retrySmall} onPress={chargerActivites}>
            <AppIcon name="refresh" size={17} color="#38BDF8" />
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
        <InfoBox text={t('partner.activitiesReadOnly', { defaultValue: 'Activités ouvertes au soutien et initiatives à suivre.' })} />
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
          illustrationSource={require('../../assets/illustrations/activities.png')}
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
              inscription={inscriptions.find((ins) => ins.activiteId === item.id)}
              actionLoading={actionLoadingId === item.id}
              onInscrire={() => handleInscrire(item.id)}
              onAnnulerInscription={() => confirmAnnulerInscription(
                inscriptions.find((ins) => ins.activiteId === item.id),
              )}
              onEdit={() => openEditForm(item)}
              onStatusChange={(statut) => confirmStatusChange(item, statut)}
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

      <ActivityFormModal
        visible={showForm}
        form={form}
        setForm={setForm}
        editing={!!editingActivity}
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
}) {
  const complete = isActiviteComplete(activite);
  const alreadyRegistered = !!inscription && inscription.statut !== 'ANNULEE';
  const canRegister = isMembre && activite.statut === 'PUBLIEE' && !alreadyRegistered && !complete;
  const status = getActivityStatus({ activite, inscription, complete }, t);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${status.color}18` }]}>
          <AppIcon name="activity" size={20} color={status.color} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>{activite.titre}</Text>
          <Text style={styles.cardSub}>{formatDateRange(activite.dateDebut, activite.dateFin, language, t)}</Text>
        </View>
        <StatusBadge label={status.label} color={status.color} />
      </View>

      {activite.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{activite.description}</Text>
      )}

      <View style={styles.chipList}>
        <InfoChip icon="location-outline" text={activite.lieu || t('activities.to_confirm')} />
        <InfoChip
          icon="wallet"
          text={activite.gratuite ? t('activities.free') : t('activities.price_value', { price: activite.prix ?? 0 })}
        />
        <InfoChip icon="group" text={formatCapacite(activite, t)} />
        {activite.theme && <InfoChip icon="pricetag-outline" text={activite.theme} />}
        {(isReferent || isAdmin) && activite.createurPrenom && (
          <InfoChip
            icon="profile"
            text={`${activite.createurPrenom || ''} ${activite.createurNom || ''}`.trim()}
          />
        )}
        {isPartenaire && <InfoChip icon="shield" text={t('partner.support')} />}
      </View>

      {!isAuthenticated && (
        <Text style={styles.visitorHint}>{t('activities.login_to_register_short')}</Text>
      )}

      {isMembre && (
        <View style={styles.actions}>
          {alreadyRegistered ? (
            <View style={styles.registeredRow}>
              <StatusLine
                text={t('activities.your_registration', { status: translateInscription(inscription.statut, t) })}
                color={status.color}
              />
              <TouchableOpacity
                style={styles.cancelRegistrationButton}
                onPress={onAnnulerInscription}
                disabled={actionLoading}
              >
                <Text style={styles.cancelRegistrationText}>{t('activities.cancel_short')}</Text>
              </TouchableOpacity>
            </View>
          ) : complete ? (
            <StatusLine text={t('activities.full')} color="#EF4444" />
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
                  {t(`statuses.${statut}`, { defaultValue: statut })}
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
      <View style={styles.modalOverlay}>
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
                placeholder="2026-06-12"
                keyboardType="numbers-and-punctuation"
              />
              <FormInput
                style={styles.formHalf}
                label={t('activities.start_time')}
                value={form.heureDebut}
                onChangeText={(value) => update('heureDebut', value)}
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.formRow}>
              <FormInput
                style={styles.formHalf}
                label={t('activities.end_time')}
                value={form.heureFin}
                onChangeText={(value) => update('heureFin', value)}
                placeholder="12:00"
                keyboardType="numbers-and-punctuation"
              />
              <FormInput
                style={styles.formHalf}
                label={t('activities.form_capacity')}
                value={form.capaciteMax}
                onChangeText={(value) => update('capaciteMax', value)}
                placeholder="20"
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

            <Text style={styles.formLabel}>{t('activities.pricing')}</Text>
            <View style={styles.pricingOptions}>
              <ChoiceButton
                selected={form.gratuite}
                label={t('activities.free')}
                onPress={() => update('gratuite', true)}
              />
              <ChoiceButton
                selected={!form.gratuite}
                label={t('activities.paid')}
                onPress={() => update('gratuite', false)}
              />
            </View>

            {!form.gratuite && (
              <FormInput
                label={t('activities.form_price')}
                value={form.prix}
                onChangeText={(value) => update('prix', value)}
                placeholder="15"
                keyboardType="decimal-pad"
              />
            )}

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
      </View>
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

function ChoiceButton({ selected, label, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.choiceButton, selected && styles.choiceButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.choiceButtonText, selected && styles.choiceButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
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
    <View style={[styles.statusBadge, { backgroundColor: color }]}>
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
}

function StatusLine({ text, color }) {
  return <Text style={[styles.statusLine, { color }]}>{text}</Text>;
}

function InfoChip({ icon, text }) {
  return (
    <View style={styles.infoChip}>
      <AppIcon name={icon} size={13} color="#1E3A8A" />
      <Text style={styles.infoChipText} numberOfLines={1}>{text}</Text>
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
    case 'PUBLIEE': return '#38BDF8';
    case 'ANNULEE': return '#EF4444';
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  retrySmall: {
    backgroundColor: '#F0F9FF',
    borderRadius: 18,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retrySmallText: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },
  newButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F97316',
    borderRadius: 15,
    paddingHorizontal: 11,
  },
  newButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },

  infoBox: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
  },
  infoBoxText: { color: '#1e40af', fontSize: 13, lineHeight: 18 },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

  listContent: { padding: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 13,
    marginBottom: 9,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleWrap: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#1E3A8A', marginBottom: 2, lineHeight: 19 },
  cardSub: { color: '#2563EB', fontSize: 11, fontWeight: '800' },
  cardDesc: { color: '#475569', fontSize: 11, lineHeight: 16, marginBottom: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  infoChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  infoChipText: { color: '#334155', fontSize: 10, fontWeight: '700', flexShrink: 1 },

  visitorHint: { color: '#38BDF8', fontSize: 13, fontWeight: '700', marginTop: 2 },
  actions: { marginTop: 2 },
  btnPrimary: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  btnDisabled: { backgroundColor: '#cbd5e1' },
  statusLine: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  registeredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cancelRegistrationButton: {
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cancelRegistrationText: { color: '#EF4444', fontSize: 11, fontWeight: '900' },
  managementBlock: {
    marginTop: 9,
    paddingTop: 9,
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
    paddingVertical: 7,
    marginBottom: 7,
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
  pricingOptions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  choiceButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  choiceButtonActive: { borderColor: '#2563EB', backgroundColor: '#E0F2FE' },
  choiceButtonText: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  choiceButtonTextActive: { color: '#1E3A8A' },
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

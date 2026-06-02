import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Platform, Linking
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function PaymentScreen({ route }) {
  const { isAuthenticated } = useAuth();

  // Paramètres passés depuis un autre écran
  const projetId   = route?.params?.projetId   || null;
  const activiteId = route?.params?.activiteId || null;
  const titre      = route?.params?.titre      || 'BX-CONNECT';

  const [montant, setMontant] = useState('10');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const MONTANTS_RAPIDES = [5, 10, 25, 50, 100];

  const handlePayer = async () => {
    if (!isAuthenticated) {
      setError('Vous devez être connecté pour effectuer un paiement.');
      return;
    }
    if (!montant || parseFloat(montant) < 1) {
      setError('Le montant minimum est de 1 €.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload = {
        montant: parseFloat(montant),
        fournisseur: 'STRIPE',
        message,
      };
      if (projetId)   payload.projetId   = projetId;
      if (activiteId) payload.activiteId = activiteId;

      const res = await api.post('/stripe/checkout', payload);

      if (res.data.checkoutUrl) {
        // Sur mobile web → ouvrir dans le navigateur
        if (Platform.OS === 'web') {
          window.location.href = res.data.checkoutUrl;
        } else {
          // Sur mobile natif → ouvrir dans le navigateur externe
          const supported = await Linking.canOpenURL(res.data.checkoutUrl);
          if (supported) {
            await Linking.openURL(res.data.checkoutUrl);
            setSuccess({
              message: 'Redirection vers Stripe...',
              sessionId: res.data.stripeSessionId,
            });
          } else {
            setError('Impossible d\'ouvrir la page de paiement.');
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du paiement.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Redirection en cours</Text>
        <Text style={styles.successText}>
          {"Complétez votre paiement dans le navigateur qui vient de s'ouvrir."}
        </Text>
        <Text style={styles.successHint}>
          {"Après le paiement, revenez dans l'application."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💳</Text>
        <Text style={styles.headerTitle}>Soutenir via Stripe</Text>
        <Text style={styles.headerSubtitle}>
          {projetId ? '🚀 Projet' : '🎯 Activité'} : {titre}
        </Text>
      </View>

      {/* Erreur */}
      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      {/* Montants rapides */}
      <Text style={styles.label}>Choisir un montant</Text>
      <View style={styles.montantsGrid}>
        {MONTANTS_RAPIDES.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.montantBtn, montant === m.toString() && styles.montantBtnActive]}
            onPress={() => setMontant(m.toString())}
          >
            <Text style={[styles.montantBtnText, montant === m.toString() && styles.montantBtnTextActive]}>
              {m}€
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Montant personnalisé */}
      <Text style={styles.label}>Ou saisir un montant</Text>
      <View style={styles.inputRow}>
        <Text style={styles.euroSign}>€</Text>
        <TextInput
          style={styles.montantInput}
          value={montant}
          onChangeText={setMontant}
          keyboardType="numeric"
          placeholder="Montant"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Message */}
      <Text style={styles.label}>Message (optionnel)</Text>
      <TextInput
        style={styles.messageInput}
        value={message}
        onChangeText={setMessage}
        placeholder="Laissez un message de soutien..."
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={3}
      />

      {/* Récapitulatif */}
      <View style={styles.recap}>
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Montant</Text>
          <Text style={styles.recapValue}>{montant} €</Text>
        </View>
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Fournisseur</Text>
          <Text style={styles.recapValue}>💳 Stripe</Text>
        </View>
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Cible</Text>
          <Text style={styles.recapValue} numberOfLines={1}>{titre}</Text>
        </View>
      </View>

      {/* Bouton payer */}
      <TouchableOpacity
        style={[styles.btnPayer, (loading || parseFloat(montant) < 1) && styles.btnDisabled]}
        onPress={handlePayer}
        disabled={loading || parseFloat(montant) < 1}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnPayerText}>💳 Payer {montant} € avec Stripe</Text>
        }
      </TouchableOpacity>

      <Text style={styles.securityNote}>
        🔒 Paiement sécurisé par Stripe — Données bancaires jamais stockées
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { padding: 20, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 24 },
  headerIcon: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center' },

  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#dc2626',
    padding: 12, borderRadius: 8, marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },

  montantsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  montantBtn: {
    flex: 1, borderWidth: 2, borderColor: '#e2e8f0',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  montantBtnActive: { borderColor: '#1e3a5f', backgroundColor: '#1e3a5f' },
  montantBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  montantBtnTextActive: { color: '#fff' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    backgroundColor: '#f8fafc', paddingHorizontal: 16, marginBottom: 16,
  },
  euroSign: { fontSize: 16, color: '#94a3b8', marginRight: 8 },
  montantInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1e293b' },

  messageInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14,
    color: '#1e293b', backgroundColor: '#f8fafc',
    height: 80, textAlignVertical: 'top', marginBottom: 16,
  },

  recap: {
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe',
  },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  recapLabel: { fontSize: 13, color: '#64748b' },
  recapValue: { fontSize: 13, fontWeight: '600', color: '#1e3a5f', maxWidth: '60%' },

  btnPayer: {
    backgroundColor: '#1e3a5f', paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginBottom: 12,
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnPayerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  securityNote: { textAlign: 'center', fontSize: 11, color: '#94a3b8' },

  // Succès
  successContainer: {
    flex: 1, backgroundColor: '#f0f4f8',
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#16a34a', marginBottom: 8 },
  successText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  successHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
});

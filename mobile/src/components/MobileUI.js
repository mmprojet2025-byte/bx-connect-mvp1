import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppIcon from './AppIcon';

export const COLORS = {
  bxBlue: '#1E3A8A',
  impactOrange: '#F97316',
  success: '#22C55E',
  danger: '#EF4444',
  info: '#38BDF8',
  surface: '#ffffff',
  page: '#F8FAFC',
  muted: '#64748b',
  border: '#e2e8f0',
  softBlue: '#E0F2FE',
  softOrange: '#ffedd5',
  softGreen: '#dcfce7',
};

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, color = COLORS.info, soft = false }) {
  return (
    <View style={[styles.badge, { backgroundColor: soft ? `${color}18` : color }]}>
      <Text style={[styles.badgeText, { color: soft ? color : '#fff' }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({ title, subtitle, icon = 'activity' }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <AppIcon name={icon} size={20} color={COLORS.info} />
      </View>
      <View style={styles.sectionText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function EmptyState({ icon = 'alert', title, text, actionLabel, onAction }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <AppIcon name={icon} size={34} color={COLORS.info} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function StatCard({ label, value, icon = 'activity', color = COLORS.info }) {
  return (
    <Card style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <AppIcon name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export function ActionCard({ label, description, icon = 'activity', color = COLORS.info, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}18` }]}>
        <AppIcon name={icon} size={20} color={color} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        {description ? <Text style={styles.actionDescription}>{description}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export function Avatar({ prenom, nom, size = 52, color = COLORS.bxBlue }) {
  const initials = ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: Math.max(14, size * 0.34) }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  badge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionText: { flex: 1 },
  sectionTitle: { color: COLORS.bxBlue, fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: COLORS.bxBlue, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  emptyText: { color: COLORS.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  emptyAction: { marginTop: 16, backgroundColor: COLORS.bxBlue, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  emptyActionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  statCard: { flex: 1, borderTopWidth: 3, minWidth: '47%', minHeight: 106 },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  statLabel: { color: COLORS.muted, fontSize: 11, lineHeight: 15 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  actionText: { flex: 1 },
  actionLabel: { color: COLORS.bxBlue, fontSize: 14, fontWeight: '900' },
  actionDescription: { color: COLORS.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },
});

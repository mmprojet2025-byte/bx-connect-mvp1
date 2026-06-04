import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppIcon from './AppIcon';

export const COLORS = {
  bxBlue: '#1E3A8A',
  bxBlueLight: '#3B82F6',
  impactOrange: '#F97316',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
  surface: '#ffffff',
  page: '#F8FAFC',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  borderSoft: '#eef2f7',
  softBlue: '#E0F2FE',
  softOrange: '#ffedd5',
  softGreen: '#dcfce7',
  softRed: '#fee2e2',
  softYellow: '#fef3c7',
  softPurple: '#ede9fe',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const BORDER_RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  colored: (color = COLORS.bxBlue) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  }),
};

export const TYPOGRAPHY = {
  hero: { fontSize: 26, lineHeight: 32, fontWeight: '900' },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '900' },
  section: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
  body: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 17 },
  tiny: { fontSize: 10, lineHeight: 14 },
};

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, color = COLORS.info, soft = false }) {
  return (
    <View style={[styles.badge, { backgroundColor: soft ? `${color}18` : color }]}>
      <Text
        style={[styles.badgeText, { color: soft ? color : '#fff' }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
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
    <Card style={styles.emptyState}>
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
    </Card>
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
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOWS.soft,
  },
  badge: { borderRadius: BORDER_RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 124 },
  badgeText: { ...TYPOGRAPHY.tiny, fontWeight: '900', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  sectionText: { flex: 1 },
  sectionTitle: { color: COLORS.bxBlue, ...TYPOGRAPHY.section },
  sectionSubtitle: { color: COLORS.muted, ...TYPOGRAPHY.caption, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: { color: COLORS.bxBlue, ...TYPOGRAPHY.title, textAlign: 'center', marginBottom: SPACING.sm },
  emptyText: { color: COLORS.muted, ...TYPOGRAPHY.body, textAlign: 'center' },
  emptyAction: { marginTop: SPACING.lg, backgroundColor: COLORS.bxBlue, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 18, paddingVertical: 11, minHeight: 46, justifyContent: 'center' },
  emptyActionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  statCard: { flex: 1, borderTopWidth: 0, minWidth: '47%', minHeight: 112 },
  statIcon: { width: 38, height: 38, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  statLabel: { color: COLORS.muted, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 68,
    ...SHADOWS.soft,
  },
  actionIcon: { width: 42, height: 42, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  actionText: { flex: 1 },
  actionLabel: { color: COLORS.bxBlue, fontSize: 14, fontWeight: '900' },
  actionDescription: { color: COLORS.muted, ...TYPOGRAPHY.caption, marginTop: 2 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },
});

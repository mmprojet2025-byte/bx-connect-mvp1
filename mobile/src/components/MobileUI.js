import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

export function LoadingState({ label }) {
  return (
    <View style={styles.feedbackState} accessibilityRole="progressbar">
      <View style={styles.feedbackIcon}>
        <ActivityIndicator size="small" color={COLORS.bxBlueLight} />
      </View>
      <Text style={styles.feedbackTitle}>{label}</Text>
    </View>
  );
}

export function ErrorState({ title, text, retryLabel, onRetry }) {
  return (
    <View style={styles.feedbackState}>
      <View style={[styles.feedbackIcon, styles.errorIcon]}>
        <AppIcon name="alert" size={30} color={COLORS.danger} />
      </View>
      <Text style={styles.feedbackTitle}>{title}</Text>
      {text ? <Text style={styles.feedbackText}>{text}</Text> : null}
      {retryLabel && onRetry ? (
        <TouchableOpacity style={styles.feedbackAction} onPress={onRetry}>
          <Text style={styles.feedbackActionText}>{retryLabel}</Text>
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
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value ?? 0}
        </Text>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      </View>
    </Card>
  );
}

export function ActionCard({
  label,
  description,
  icon = 'activity',
  color = COLORS.info,
  onPress,
  compact = false,
  style,
}) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, compact && styles.actionCardCompact, style]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.actionIcon, compact && styles.actionIconCompact, { backgroundColor: `${color}18` }]}>
        <AppIcon name={icon} size={compact ? 19 : 20} color={color} />
      </View>
      <View style={[styles.actionText, compact && styles.actionTextCompact]}>
        <Text style={[styles.actionLabel, compact && styles.actionLabelCompact]} numberOfLines={2}>
          {label}
        </Text>
        {description ? (
          <Text
            style={[styles.actionDescription, compact && styles.actionDescriptionCompact]}
            numberOfLines={compact ? 2 : undefined}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {compact ? (
        <AppIcon
          name="chevron-forward"
          size={14}
          color={COLORS.muted}
          style={styles.actionChevron}
        />
      ) : null}
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
  feedbackState: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.page,
  },
  feedbackIcon: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  errorIcon: { backgroundColor: COLORS.softRed },
  feedbackTitle: {
    color: COLORS.bxBlue,
    ...TYPOGRAPHY.section,
    textAlign: 'center',
  },
  feedbackText: {
    color: COLORS.muted,
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginTop: SPACING.sm,
    maxWidth: 320,
  },
  feedbackAction: {
    minHeight: 44,
    marginTop: SPACING.lg,
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.bxBlue,
    paddingHorizontal: SPACING.xl,
  },
  feedbackActionText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  statCard: {
    flex: 1,
    minWidth: '47%',
    minHeight: 78,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  statContent: { flex: 1, minWidth: 0 },
  statValue: { fontSize: 20, lineHeight: 23, fontWeight: '900' },
  statLabel: { color: COLORS.muted, fontSize: 10, lineHeight: 13, fontWeight: '700', flexShrink: 1 },
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
  actionCardCompact: {
    width: '48.5%',
    minHeight: 102,
    padding: 10,
    marginBottom: 0,
    alignItems: 'flex-start',
    flexDirection: 'column',
    position: 'relative',
  },
  actionIconCompact: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    marginRight: 0,
    marginBottom: 6,
  },
  actionTextCompact: { flex: 1, width: '100%' },
  actionLabelCompact: { fontSize: 13, lineHeight: 17 },
  actionDescriptionCompact: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  actionChevron: { position: 'absolute', top: 12, right: 10 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },
});

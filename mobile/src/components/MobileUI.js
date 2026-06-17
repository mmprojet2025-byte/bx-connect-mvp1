import { ActivityIndicator, Image, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppIcon from './AppIcon';

export const COLORS = {
  bxBlue: '#1E3A8A',
  bxBlueLight: '#2563EB',
  interactive: '#2563EB',
  impactOrange: '#F97316',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
  surface: '#FFFFFF',
  page: '#F3F4F6',
  text: '#111827',
  muted: '#64748B',
  border: '#E5E7EB',
  borderSoft: '#E5E7EB',
  softBlue: '#EFF6FF',
  softOrange: '#FFF7ED',
  softGreen: '#F0FDF4',
  softRed: '#FEF2F2',
  softYellow: '#FFFBEB',
  softPurple: '#F5F3FF',
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
  md: 12,
  lg: 14,
  xl: 14,
  xxl: 14,
  pill: 999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  medium: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  colored: (color = COLORS.bxBlue) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  }),
};

export const TYPOGRAPHY = {
  hero: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '700' },
  section: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 14, lineHeight: 19 },
  tiny: { fontSize: 12, lineHeight: 16 },
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

export function EmptyState({
  icon = 'alert',
  illustrationSource,
  title,
  text,
  actionLabel,
  onAction,
}) {
  return (
    <Card style={styles.emptyState}>
      {illustrationSource ? (
        <View style={styles.emptyIllustrationFrame}>
          <Image source={illustrationSource} style={styles.emptyIllustration} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.emptyIcon}>
          <AppIcon name={icon} size={34} color={COLORS.info} />
        </View>
      )}
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
  badgeText: { ...TYPOGRAPHY.tiny, fontWeight: '700', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  sectionText: { flex: 1 },
  sectionTitle: { color: COLORS.bxBlue, ...TYPOGRAPHY.section },
  sectionSubtitle: { color: COLORS.muted, ...TYPOGRAPHY.caption, marginTop: 2 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    borderRadius: 20,
    ...SHADOWS.medium,
  },
  emptyIllustrationFrame: {
    width: 200,
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F8FBFF',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.bxBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  emptyIllustration: { width: '100%', height: '100%' },
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
  emptyAction: { marginTop: SPACING.lg, backgroundColor: COLORS.interactive, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 18, paddingVertical: 11, minHeight: 44, justifyContent: 'center' },
  emptyActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
    backgroundColor: COLORS.interactive,
    paddingHorizontal: SPACING.xl,
  },
  feedbackActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
  statValue: { fontSize: 20, lineHeight: 23, fontWeight: '700' },
  statLabel: { color: COLORS.muted, fontSize: 14, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 64,
    ...SHADOWS.soft,
  },
  actionIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  actionText: { flex: 1 },
  actionLabel: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  actionDescription: { color: COLORS.muted, ...TYPOGRAPHY.caption, marginTop: 2 },
  actionCardCompact: {
    width: '48.5%',
    minHeight: 108,
    padding: 12,
    marginBottom: 0,
    alignItems: 'flex-start',
    flexDirection: 'column',
    position: 'relative',
  },
  actionIconCompact: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    marginRight: 0,
    marginBottom: 6,
  },
  actionTextCompact: { flex: 1, width: '100%' },
  actionLabelCompact: { fontSize: 14, lineHeight: 18 },
  actionDescriptionCompact: { fontSize: 14, lineHeight: 18, marginTop: 3 },
  actionChevron: { position: 'absolute', top: 12, right: 10 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
});

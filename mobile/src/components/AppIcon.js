import { Ionicons } from '@expo/vector-icons';

const ICONS = {
  activity: 'calendar-outline',
  alert: 'notifications-outline',
  bell: 'notifications-outline',
  building: 'business-outline',
  check: 'checkmark-circle-outline',
  close: 'close-outline',
  edit: 'create-outline',
  group: 'people-outline',
  home: 'home-outline',
  lock: 'lock-closed-outline',
  logout: 'log-out-outline',
  message: 'chatbubble-ellipses-outline',
  payment: 'card-outline',
  profile: 'person-outline',
  project: 'rocket-outline',
  refresh: 'refresh-outline',
  save: 'save-outline',
  search: 'search-outline',
  send: 'send-outline',
  shield: 'shield-checkmark-outline',
  trash: 'trash-outline',
  user: 'person-outline',
  wallet: 'wallet-outline',
  globe: 'globe-outline',
  phone: 'call-outline',
  warning: 'alert-circle-outline',
};

export default function AppIcon({ name, size = 22, color = '#1E3A8A', style }) {
  return (
    <Ionicons
      name={ICONS[name] || name || 'ellipse-outline'}
      size={size}
      color={color}
      style={style}
    />
  );
}

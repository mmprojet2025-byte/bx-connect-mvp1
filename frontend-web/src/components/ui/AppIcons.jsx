const ICONS = {
  Dashboard: (
    <>
      <path d="M4 13h6V4H4v9z" />
      <path d="M14 20h6V4h-6v16z" />
      <path d="M4 20h6v-3H4v3z" />
    </>
  ),
  Wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 016.5 5H18a2 2 0 012 2v10a2 2 0 01-2 2H6.5A2.5 2.5 0 014 16.5v-9z" />
      <path d="M4 8h15" />
      <path d="M16 12.5h4v3h-4a1.5 1.5 0 010-3z" />
    </>
  ),
  Calendar: (
    <>
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <path d="M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z" />
    </>
  ),
  Folder: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  Rocket: (
    <>
      <path d="M5 15c2-6 6-10 14-10-1 8-4 12-10 14l-4-4z" />
      <path d="M14 6l4 4" />
      <path d="M6 18l-3 3 1-5" />
      <path d="M9 15l-5 1" />
    </>
  ),
  Bell: (
    <>
      <path d="M18 9a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9z" />
      <path d="M10 21h4" />
    </>
  ),
  User: (
    <>
      <path d="M20 21a8 8 0 10-16 0" />
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
    </>
  ),
  CheckCircle: (
    <>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M8.5 12.5l2.2 2.2 4.8-5.2" />
    </>
  ),
  PlusCircle: (
    <>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </>
  ),
  Clock: (
    <>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  XCircle: (
    <>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </>
  ),
  Users: (
    <>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <path d="M9 11a4 4 0 100-8 4 4 0 000 8z" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </>
  ),
  MessageCircle: (
    <>
      <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.8 8.8 0 01-3.8-.9L3 20l1.2-4.4A8.2 8.2 0 013 11.5 8.5 8.5 0 1121 11.5z" />
    </>
  ),
  Shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  Settings: (
    <>
      <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1A2 2 0 014.2 17l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9L4.3 7A2 2 0 017 4.2l.1.1a1.7 1.7 0 001.9.3 1.7 1.7 0 001-1.6V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1A2 2 0 0119.8 7l-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.6 1h.1a2 2 0 010 4H21a1.7 1.7 0 00-1.6 1z" />
    </>
  ),
  Handshake: (
    <>
      <path d="M7 11l2.2-2.2a2.7 2.7 0 013.8 0l.5.5" />
      <path d="M12.5 8.5l1.1-1.1a2.7 2.7 0 013.8 0L21 11" />
      <path d="M3 11l4 4 2-2" />
      <path d="M21 11l-5.8 5.8a2 2 0 01-2.8 0L9 13.4" />
      <path d="M8 16l1.5 1.5" />
      <path d="M11 18l1 1" />
    </>
  ),
  Edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>
  ),
  Save: (
    <>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M7 3v6h8" />
      <path d="M7 21v-8h10v8" />
    </>
  ),
  Lock: (
    <>
      <path d="M6 10V8a6 6 0 1112 0v2" />
      <path d="M5 10h14v11H5z" />
    </>
  ),
  LogOut: (
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  Home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  Search: (
    <>
      <path d="M11 19a8 8 0 100-16 8 8 0 000 16z" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  Camera: (
    <>
      <path d="M4 7h4l2-3h4l2 3h4v13H4z" />
      <path d="M12 17a4 4 0 100-8 4 4 0 000 8z" />
    </>
  ),
  AlertTriangle: (
    <>
      <path d="M10.3 4.3L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  Mail: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  MapPin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1116 0z" />
      <path d="M12 13a3 3 0 100-6 3 3 0 000 6z" />
    </>
  ),
  Megaphone: (
    <>
      <path d="M3 11v2a2 2 0 002 2h2l4 4v-4l8-3V8l-8-3v10" />
      <path d="M19 8a3 3 0 010 4" />
    </>
  ),
  Pin: (
    <>
      <path d="M12 17v5" />
      <path d="M5 17h14l-3-5V5l2-2H6l2 2v7l-3 5z" />
    </>
  ),
  Globe: (
    <>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 010 18" />
      <path d="M12 3a14 14 0 000 18" />
    </>
  ),
  Star: (
    <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3z" />
  ),
  Lightbulb: (
    <>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8 14a6 6 0 118 0c-1.5 1-1.5 2.5-1.5 4h-5c0-1.5 0-3-1.5-4z" />
    </>
  ),
  Eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </>
  ),
  EyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
      <path d="M9.9 4.2A10.8 10.8 0 0112 4c6.5 0 10 8 10 8a17.8 17.8 0 01-2.1 3.2" />
      <path d="M6.6 6.6C3.7 8.6 2 12 2 12s3.5 8 10 8a10.5 10.5 0 005.4-1.5" />
    </>
  ),
  CreditCard: (
    <>
      <path d="M3 6h18v12H3z" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </>
  ),
  Building: (
    <>
      <path d="M4 21V5l8-3 8 3v16" />
      <path d="M9 21v-4h6v4" />
      <path d="M8 7h.01" />
      <path d="M12 7h.01" />
      <path d="M16 7h.01" />
      <path d="M8 11h.01" />
      <path d="M12 11h.01" />
      <path d="M16 11h.01" />
    </>
  ),
  Phone: (
    <>
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.4 2.1L8.1 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.9.6 2.9.7a2 2 0 011.6 1.9z" />
    </>
  ),
};

export default function AppIcon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name] || ICONS.Folder}
    </svg>
  );
}

import { makeStyles, tokens } from '@fluentui/react-components';
import {
  Avatar,
  Button,
  CounterBadge,
  Text,
  Caption1,
  Subtitle2,
} from '@fluentui/react-components';
import {
  HomeRegular, HomeFilled,
  PeopleSearchRegular, PeopleSearchFilled,
  CalendarLtrRegular, CalendarLtrFilled,
  ChatMultipleRegular, ChatMultipleFilled,
  PersonRegular, PersonFilled,
  ClockRegular, ClockFilled,
  ArrowExitRegular,
  bundleIcon,
} from '@fluentui/react-icons';
import { Link, useLocation } from 'react-router-dom';
import { useUnreadCount } from '../hooks/useUnreadCount';

const HomeIcon        = bundleIcon(HomeFilled,            HomeRegular);
const SearchIcon      = bundleIcon(PeopleSearchFilled,    PeopleSearchRegular);
const CalendarIcon    = bundleIcon(CalendarLtrFilled,     CalendarLtrRegular);
const ChatIcon        = bundleIcon(ChatMultipleFilled,    ChatMultipleRegular);
const PersonIcon      = bundleIcon(PersonFilled,          PersonRegular);
const ClockIcon       = bundleIcon(ClockFilled,           ClockRegular);

const CANDIDATE_NAV = [
  { label: 'Dashboard',          to: '/dashboard',  Icon: HomeIcon },
  { label: 'Find Interviewers',  to: '/discovery',  Icon: SearchIcon },
  { label: 'My Sessions',        to: '/bookings',   Icon: CalendarIcon },
  { label: 'Messages',           to: '/messages',   Icon: ChatIcon, badge: true },
  { label: 'Profile',            to: '/profile/edit', Icon: PersonIcon },
];

const INTERVIEWER_NAV = [
  { label: 'Dashboard',      to: '/dashboard',    Icon: HomeIcon },
  { label: 'Availability',   to: '/availability', Icon: ClockIcon },
  { label: 'Sessions',       to: '/bookings',     Icon: CalendarIcon },
  { label: 'Messages',       to: '/messages',     Icon: ChatIcon, badge: true },
  { label: 'Profile',        to: '/profile/edit', Icon: PersonIcon },
];

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    minWidth: '260px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: tokens.colorNeutralStroke2,
    display: 'flex',
    flexDirection: 'column',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `18px ${tokens.spacingHorizontalL}`,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    flexShrink: 0,
  },
  logoMark: {
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase400,
    flexShrink: 0,
    userSelect: 'none',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalS}`,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    textDecoration: 'none',
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    position: 'relative',
    transition: 'background 0.12s, color 0.12s',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  navItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      color: tokens.colorBrandForeground1,
    },
  },
  navLabel: {
    flex: 1,
  },
  navIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  userSection: {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    padding: tokens.spacingVerticalM,
    flexShrink: 0,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: '8px',
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalS,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
});

function NavItem({ item, isActive, unreadCount }) {
  const styles = useStyles();
  return (
    <Link
      to={item.to}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
      style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
    >
      <span className={styles.navIcon} style={{ color: isActive ? tokens.colorBrandForeground1 : undefined }}>
        <item.Icon filled={isActive} style={{ fontSize: '18px' }} />
      </span>
      <span className={styles.navLabel}>{item.label}</span>
      {item.badge && unreadCount > 0 && (
        <CounterBadge count={unreadCount > 99 ? 99 : unreadCount} color="brand" size="small" />
      )}
    </Link>
  );
}

export function AppShell({ email, profileType, signOut, userId, children }) {
  const styles = useStyles();
  const location = useLocation();
  const unreadCount = useUnreadCount(userId);

  const navItems = profileType === 'Interviewer' ? INTERVIEWER_NAV : CANDIDATE_NAV;
  const nameDisplay = email?.split('@')[0] ?? email ?? 'User';
  const initials = nameDisplay.slice(0, 2).toUpperCase();

  return (
    <div className={styles.root}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoMark}>H</div>
          <div className={styles.logoText}>
            <Text weight="semibold" size={300} style={{ lineHeight: 1.2 }}>HireSphere</Text>
            <Caption1 style={{ color: tokens.colorNeutralForeground3, lineHeight: 1.3 }}>
              Interview platform
            </Caption1>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              isActive={
                item.to === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.to)
              }
              unreadCount={unreadCount}
            />
          ))}
        </nav>

        {/* User section */}
        <div className={styles.userSection}>
          <div className={styles.userRow}>
            <Avatar name={nameDisplay} initials={initials} size={32} color="brand" />
            <div className={styles.userInfo}>
              <Text
                size={200}
                weight="semibold"
                block
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {nameDisplay}
              </Text>
              <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{profileType}</Caption1>
            </div>
          </div>
          <Button
            appearance="subtle"
            icon={<ArrowExitRegular />}
            onClick={signOut}
            size="small"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            Sign out
          </Button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}

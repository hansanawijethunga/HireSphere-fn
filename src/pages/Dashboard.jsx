import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import {
  Badge,
  Button,
  Card,
  Spinner,
  Text,
  Title2,
  Title3,
  Subtitle1,
  Subtitle2,
  Body1,
  Body2,
  Caption1,
} from '@fluentui/react-components';
import {
  CalendarLtrRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  ChatRegular,
  StarRegular,
  PeopleSearchRegular,
  ArrowRightRegular,
  AlertRegular,
  VideoRegular,
  CheckmarkRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { format, isAfter, isBefore, addMinutes } from 'date-fns';
import { fetchMyBookings, updateBookingStatus } from '../utils/bookingApi';
import { useUnreadCount } from '../hooks/useUnreadCount';

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  page: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  greeting: {
    marginBottom: '28px',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: tokens.spacingHorizontalL,
    marginBottom: '28px',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  statCard: {
    padding: '20px 24px',
    borderRadius: tokens.borderRadiusXLarge,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: 'none',
  },
  statIconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: tokens.spacingHorizontalXL,
    alignItems: 'start',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
    },
  },
  sectionCard: {
    borderRadius: tokens.borderRadiusXLarge,
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    ':last-child': { borderBottomWidth: '0' },
  },
  dateTile: {
    width: '52px',
    minWidth: '52px',
    height: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralStroke2,
  },
  pendingActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  ctaCard: {
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground}, #0050a0)`,
    borderRadius: tokens.borderRadiusXLarge,
    padding: '24px',
    color: 'white',
    marginBottom: '20px',
  },
  quickLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  quickLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: tokens.borderRadiusMedium,
    textDecoration: 'none',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralStroke2,
    transition: 'all 0.12s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      borderColor: tokens.colorBrandStroke1,
    },
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    gap: '8px',
    color: tokens.colorNeutralForeground3,
  },
});

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, bg, iconColor, loading }) {
  const styles = useStyles();
  return (
    <Card className={styles.statCard}>
      <div className={styles.statIconWrap} style={{ backgroundColor: bg }}>
        <span style={{ color: iconColor, fontSize: '22px', display: 'flex' }}>{icon}</span>
      </div>
      <div>
        {loading ? (
          <Spinner size="small" />
        ) : (
          <Title2 style={{ lineHeight: 1 }}>{value}</Title2>
        )}
        <Body2 style={{ color: tokens.colorNeutralForeground2, marginTop: '4px' }}>{label}</Body2>
      </div>
    </Card>
  );
}

// ── Date tile ─────────────────────────────────────────────────────────────────

function DateTile({ iso }) {
  const styles = useStyles();
  const d = new Date(iso);
  return (
    <div className={styles.dateTile}>
      <Caption1 style={{ color: tokens.colorNeutralForeground2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {format(d, 'MMM')}
      </Caption1>
      <Text weight="bold" size={500} style={{ lineHeight: 1 }}>{format(d, 'd')}</Text>
      <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>{format(d, 'EEE')}</Caption1>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const colorMap = { Confirmed: 'success', Pending: 'warning', Rejected: 'danger' };
  return (
    <Badge appearance="filled" color={colorMap[status] ?? 'informative'} size="small">
      {status}
    </Badge>
  );
}

// ── Candidate Dashboard ───────────────────────────────────────────────────────

function CandidateDashboard({ email, userId }) {
  const styles = useStyles();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const unread = useUnreadCount(userId);
  const now = new Date();

  const firstName = email?.split('@')[0] ?? 'there';
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    fetchMyBookings('Candidate')
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming  = bookings.filter(b => b.status === 'Confirmed' && isAfter(new Date(b.scheduledAt), now))
                            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const pending   = bookings.filter(b => b.status === 'Pending');
  const completed = bookings.filter(b => isBefore(addMinutes(new Date(b.scheduledAt), b.durationMinutes ?? 60), now));
  const nextSession = upcoming[0];

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <Title2>{greeting}, {firstName}</Title2>
        <Body1 style={{ color: tokens.colorNeutralForeground2, marginTop: '4px' }}>
          {format(now, 'EEEE, MMMM d, yyyy')}
        </Body1>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <StatCard label="Upcoming sessions" value={upcoming.length} icon={<CalendarLtrRegular />}
          bg="#EBF3FB" iconColor="#0078D4" loading={loading} />
        <StatCard label="Sessions completed" value={completed.length} icon={<CheckmarkCircleRegular />}
          bg="#EFF6EE" iconColor="#107C10" loading={loading} />
        <StatCard label="Pending requests" value={pending.length} icon={<ClockRegular />}
          bg="#FFF4CE" iconColor="#835B00" loading={loading} />
        <StatCard label="Unread messages" value={unread} icon={<ChatRegular />}
          bg="#F3E6F8" iconColor="#8764B8" loading={false} />
      </div>

      {/* Content grid */}
      <div className={styles.contentGrid}>
        {/* Left: upcoming sessions */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Subtitle2>Upcoming Sessions</Subtitle2>
            <Button as={Link} to="/bookings" appearance="transparent" size="small"
              icon={<ArrowRightRegular />} iconPosition="after">
              View all
            </Button>
          </div>

          {loading && (
            <div className={styles.emptyState}><Spinner size="small" label="Loading…" /></div>
          )}

          {!loading && upcoming.length === 0 && (
            <div className={styles.emptyState}>
              <CalendarLtrRegular style={{ fontSize: '32px' }} />
              <Body2>No upcoming sessions</Body2>
              <Caption1>Book a session with an interviewer to get started</Caption1>
            </div>
          )}

          {!loading && upcoming.slice(0, 5).map(b => (
            <div key={b.id} className={styles.sessionItem}>
              <DateTile iso={b.scheduledAt} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Body1 weight="semibold">{format(new Date(b.scheduledAt), 'h:mm a')}</Body1>
                <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>
                  {b.durationMinutes} min session
                </Caption1>
              </div>
              <StatusBadge status={b.status} />
              <Button as={Link} to={`/room/${b.id}`} size="small" icon={<VideoRegular />}
                appearance="outline">
                Join
              </Button>
            </div>
          ))}
        </Card>

        {/* Right: CTA + quick links */}
        <div>
          <div className={styles.ctaCard}>
            <Text size={400} weight="semibold" style={{ color: 'rgba(255,255,255,0.85)' }} block>
              Ready to practice?
            </Text>
            <Title3 style={{ color: 'white', marginTop: '4px', marginBottom: '16px' }}>
              Find your next interviewer
            </Title3>
            <Button as={Link} to="/discovery" appearance="secondary"
              icon={<PeopleSearchRegular />}
              style={{ backgroundColor: 'white', color: tokens.colorBrandForeground1 }}>
              Browse Interviewers
            </Button>
          </div>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Subtitle2>Quick Links</Subtitle2>
            </div>
            <div style={{ padding: '16px' }}>
              <div className={styles.quickLinks}>
                {[
                  { label: 'Find Interviewers', to: '/discovery', icon: <PeopleSearchRegular /> },
                  { label: 'My Sessions',        to: '/bookings',  icon: <CalendarLtrRegular /> },
                  { label: 'Messages',           to: '/messages',  icon: <ChatRegular /> },
                  { label: 'Edit Profile',       to: '/profile/edit', icon: <AlertRegular /> },
                ].map(({ label, to, icon }) => (
                  <Link key={to} to={to} className={styles.quickLink}>
                    <span style={{ color: tokens.colorBrandForeground1, fontSize: '18px', display: 'flex' }}>{icon}</span>
                    <Body2 weight="semibold">{label}</Body2>
                    <ArrowRightRegular style={{ marginLeft: 'auto', color: tokens.colorNeutralForeground3 }} />
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Interviewer Dashboard ─────────────────────────────────────────────────────

function InterviewerDashboard({ email, userId }) {
  const styles = useStyles();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const unread = useUnreadCount(userId);
  const now = new Date();

  const firstName = email?.split('@')[0] ?? 'there';
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    fetchMyBookings('Interviewer')
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pending   = bookings.filter(b => b.status === 'Pending');
  const upcoming  = bookings.filter(b => b.status === 'Confirmed' && isAfter(new Date(b.scheduledAt), now))
                            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const completed = bookings.filter(b => isBefore(addMinutes(new Date(b.scheduledAt), b.durationMinutes ?? 60), now));

  async function handleAction(bookingId, status) {
    setActionLoading(bookingId + status);
    try {
      const updated = await updateBookingStatus(bookingId, status);
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    } catch {}
    finally { setActionLoading(null); }
  }

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <Title2>{greeting}, {firstName}</Title2>
        <Body1 style={{ color: tokens.colorNeutralForeground2, marginTop: '4px' }}>
          {format(now, 'EEEE, MMMM d, yyyy')}
        </Body1>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <StatCard label="Pending requests" value={pending.length} icon={<AlertRegular />}
          bg="#FFF4CE" iconColor="#835B00" loading={loading} />
        <StatCard label="Upcoming sessions" value={upcoming.length} icon={<CalendarLtrRegular />}
          bg="#EBF3FB" iconColor="#0078D4" loading={loading} />
        <StatCard label="Sessions completed" value={completed.length} icon={<CheckmarkCircleRegular />}
          bg="#EFF6EE" iconColor="#107C10" loading={loading} />
        <StatCard label="Unread messages" value={unread} icon={<ChatRegular />}
          bg="#F3E6F8" iconColor="#8764B8" loading={false} />
      </div>

      {/* Content grid */}
      <div className={styles.contentGrid}>
        {/* Left: pending requests */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Subtitle2>Pending Requests</Subtitle2>
              {pending.length > 0 && (
                <Badge appearance="filled" color="warning" size="small">{pending.length}</Badge>
              )}
            </div>
            <Button as={Link} to="/bookings" appearance="transparent" size="small"
              icon={<ArrowRightRegular />} iconPosition="after">
              View all
            </Button>
          </div>

          {loading && (
            <div className={styles.emptyState}><Spinner size="small" label="Loading…" /></div>
          )}

          {!loading && pending.length === 0 && (
            <div className={styles.emptyState}>
              <CheckmarkCircleRegular style={{ fontSize: '32px' }} />
              <Body2>No pending requests</Body2>
              <Caption1>All caught up!</Caption1>
            </div>
          )}

          {!loading && pending.map(b => (
            <div key={b.id} className={styles.sessionItem}>
              <DateTile iso={b.scheduledAt} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Body1 weight="semibold">{format(new Date(b.scheduledAt), 'h:mm a, MMM d')}</Body1>
                <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>
                  {b.durationMinutes} min · {b.paymentStatus}
                </Caption1>
                <div className={styles.pendingActions}>
                  <Button
                    size="small" appearance="primary" icon={<CheckmarkRegular />}
                    disabled={!!actionLoading}
                    onClick={() => handleAction(b.id, 'Confirmed')}
                  >
                    {actionLoading === b.id + 'Confirmed' ? <Spinner size="tiny" /> : 'Confirm'}
                  </Button>
                  <Button
                    size="small" appearance="outline" icon={<DismissRegular />}
                    disabled={!!actionLoading}
                    onClick={() => handleAction(b.id, 'Rejected')}
                  >
                    {actionLoading === b.id + 'Rejected' ? <Spinner size="tiny" /> : 'Reject'}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Upcoming sessions section */}
          {!loading && upcoming.length > 0 && (
            <>
              <div className={styles.sectionHeader} style={{ marginTop: 0 }}>
                <Subtitle2>Upcoming Confirmed</Subtitle2>
              </div>
              {upcoming.slice(0, 3).map(b => (
                <div key={b.id} className={styles.sessionItem}>
                  <DateTile iso={b.scheduledAt} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Body1 weight="semibold">{format(new Date(b.scheduledAt), 'h:mm a, MMM d')}</Body1>
                    <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>
                      {b.durationMinutes} min session
                    </Caption1>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </>
          )}
        </Card>

        {/* Right: CTA + quick links */}
        <div>
          <div className={styles.ctaCard}>
            <Text size={400} weight="semibold" style={{ color: 'rgba(255,255,255,0.85)' }} block>
              Stay available
            </Text>
            <Title3 style={{ color: 'white', marginTop: '4px', marginBottom: '16px' }}>
              Manage your schedule
            </Title3>
            <Button as={Link} to="/availability" appearance="secondary"
              icon={<ClockRegular />}
              style={{ backgroundColor: 'white', color: tokens.colorBrandForeground1 }}>
              Set Availability
            </Button>
          </div>

          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Subtitle2>Quick Links</Subtitle2>
            </div>
            <div style={{ padding: '16px' }}>
              <div className={styles.quickLinks}>
                {[
                  { label: 'My Availability', to: '/availability', icon: <ClockRegular /> },
                  { label: 'All Sessions',    to: '/bookings',     icon: <CalendarLtrRegular /> },
                  { label: 'Messages',        to: '/messages',     icon: <ChatRegular /> },
                  { label: 'Edit Profile',    to: '/profile/edit', icon: <AlertRegular /> },
                ].map(({ label, to, icon }) => (
                  <Link key={to} to={to} className={styles.quickLink}>
                    <span style={{ color: tokens.colorBrandForeground1, fontSize: '18px', display: 'flex' }}>{icon}</span>
                    <Body2 weight="semibold">{label}</Body2>
                    <ArrowRightRegular style={{ marginLeft: 'auto', color: tokens.colorNeutralForeground3 }} />
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export function Dashboard({ email, profileType, userId }) {
  if (profileType === 'Interviewer') {
    return <InterviewerDashboard email={email} userId={userId} />;
  }
  return <CandidateDashboard email={email} userId={userId} />;
}

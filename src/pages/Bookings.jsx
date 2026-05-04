import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import {
  Badge,
  Button,
  Card,
  Spinner,
  Tab,
  TabList,
  Text,
  Title2,
  Subtitle2,
  Body1,
  Body2,
  Caption1,
} from '@fluentui/react-components';
import {
  CalendarLtrRegular,
  VideoRegular,
  CheckmarkRegular,
  DismissRegular,
  ArrowSyncRegular,
  PeopleSearchRegular,
  ClockRegular,
} from '@fluentui/react-icons';
import { format, isAfter, addMinutes, isBefore, subMinutes } from 'date-fns';
import { fetchMyBookings, updateBookingStatus } from '../utils/bookingApi';
import { SubmissionUpload } from '../components/SubmissionUpload';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    padding: '24px 32px',
    flexShrink: 0,
  },
  tabBar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    padding: '0 32px',
    flexShrink: 0,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    maxWidth: '860px',
  },
  bookingCard: {
    borderRadius: tokens.borderRadiusXLarge,
    overflow: 'hidden',
  },
  cardContent: {
    padding: '20px 24px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '18px',
    justifyContent: 'space-between',
  },
  dateTile: {
    width: '56px',
    minWidth: '56px',
    height: '64px',
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
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
    flexShrink: 0,
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
  },
  submissionSection: {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    padding: '16px 24px',
    marginTop: '0',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 32px',
    gap: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

const STATUS_COLOR = {
  Confirmed: 'success',
  Pending:   'warning',
  Rejected:  'danger',
};

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

function JoinButton({ booking }) {
  const now = new Date();
  const start = new Date(booking.scheduledAt);
  const end = addMinutes(start, booking.durationMinutes ?? 60);
  const windowOpen = subMinutes(start, 5);

  if (booking.status !== 'Confirmed') return null;
  if (isAfter(now, end)) {
    return (
      <Badge appearance="outline" color="informative" size="medium">Completed</Badge>
    );
  }
  if (isBefore(now, windowOpen)) {
    return (
      <Badge appearance="outline" size="medium" icon={<ClockRegular />}>
        Starts {format(start, 'h:mm a')}
      </Badge>
    );
  }
  return (
    <Button as={Link} to={`/room/${booking.id}`} state={{ booking }}
      appearance="primary" icon={<VideoRegular />} size="small">
      Join Now
    </Button>
  );
}

function BookingItem({ booking, isInterviewer, onStatusUpdate }) {
  const styles = useStyles();
  const [actLoading, setActLoading] = useState(null);
  const [actError,   setActError]   = useState('');
  const [showSubmit, setShowSubmit] = useState(false);

  const canAct    = isInterviewer && booking.status === 'Pending';
  const canSubmit = booking.status === 'Confirmed';

  async function handleAction(status) {
    setActLoading(status);
    setActError('');
    try {
      const updated = await updateBookingStatus(booking.id, status);
      onStatusUpdate(updated);
    } catch (e) {
      setActError(e.message || 'Action failed.');
    } finally { setActLoading(null); }
  }

  return (
    <Card className={styles.bookingCard}>
      <div className={styles.cardContent}>
        <div className={styles.topRow}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <DateTile iso={booking.scheduledAt} />
            <div className={styles.infoCol}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <Body1 weight="semibold">{format(new Date(booking.scheduledAt), 'h:mm a')}</Body1>
                <Badge appearance="filled" color={STATUS_COLOR[booking.status] ?? 'informative'} size="small">
                  {booking.status}
                </Badge>
              </div>
              <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>
                {format(new Date(booking.scheduledAt), 'EEEE, MMMM d, yyyy')}
              </Caption1>
              <Caption1 style={{ color: tokens.colorNeutralForeground2, display: 'block', marginTop: '2px' }}>
                {booking.durationMinutes} min ·{' '}
                {booking.status === 'Rejected'
                  ? <span style={{ color: '#107C10' }}>Refunded</span>
                  : <span>Payment: <strong>{booking.paymentStatus}</strong></span>
                }
              </Caption1>
              <Caption1 style={{ color: tokens.colorNeutralForeground4, fontFamily: 'monospace', marginTop: '4px', display: 'block' }}>
                #{booking.id.slice(0, 8).toUpperCase()}
              </Caption1>
            </div>
          </div>

          <div className={styles.actions}>
            <JoinButton booking={booking} />

            {canAct && (
              <div className={styles.actionRow}>
                <Button size="small" appearance="primary" icon={<CheckmarkRegular />}
                  disabled={!!actLoading} onClick={() => handleAction('Confirmed')}>
                  {actLoading === 'Confirmed' ? <Spinner size="tiny" /> : 'Confirm'}
                </Button>
                <Button size="small" appearance="outline" icon={<DismissRegular />}
                  disabled={!!actLoading} onClick={() => handleAction('Rejected')}>
                  {actLoading === 'Rejected' ? <Spinner size="tiny" /> : 'Reject'}
                </Button>
              </div>
            )}

            {actError && (
              <Caption1 style={{ color: '#750B1C' }} role="alert">{actError}</Caption1>
            )}

            {/* Message link */}
            {(isInterviewer ? booking.candidateId : booking.interviewerId) && (
              <Button as={Link} size="small" appearance="subtle"
                to={`/messages/${isInterviewer ? booking.candidateId : booking.interviewerId}`}>
                Message
              </Button>
            )}
          </div>
        </div>
      </div>

      {canSubmit && (
        <div className={styles.submissionSection}>
          <Button appearance="transparent" size="small"
            onClick={() => setShowSubmit(v => !v)}>
            {showSubmit ? 'Hide' : isInterviewer ? 'View & evaluate submission' : 'Submit your solution'}
          </Button>
          {showSubmit && (
            <div style={{ marginTop: '12px' }}>
              <SubmissionUpload bookingId={booking.id}
                profileType={isInterviewer ? 'Interviewer' : 'Candidate'} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function Bookings({ email, profileType }) {
  const styles = useStyles();
  const [bookings,   setBookings]   = useState([]);
  const [loadState,  setLoadState]  = useState('loading');
  const [loadError,  setLoadError]  = useState('');
  const [activeTab,  setActiveTab]  = useState('upcoming');
  const isInterviewer = profileType === 'Interviewer';
  const now = new Date();
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!profileType) return;
    setLoadState('loading');
    fetchMyBookings(profileType)
      .then(data  => { setBookings(data); setLoadState('ready'); })
      .catch(err  => { setLoadError(err.message || 'Failed to load.'); setLoadState('error'); });
  }, [profileType]);

  function onStatusUpdate(updated) {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
  }

  const upcoming = bookings.filter(b => isAfter(new Date(b.scheduledAt), now))
                           .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const past     = bookings.filter(b => !isAfter(new Date(b.scheduledAt), now))
                           .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  const pendingCount = bookings.filter(b => b.status === 'Pending').length;
  const displayList  = activeTab === 'upcoming' ? upcoming : past;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title2>Sessions</Title2>
            <Body1 style={{ color: tokens.colorNeutralForeground2, marginTop: '4px' }}>
              {isInterviewer
                ? 'Manage booking requests and upcoming sessions.'
                : 'Your scheduled interview sessions.'}
            </Body1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isInterviewer && pendingCount > 0 && (
              <Badge appearance="filled" color="warning" size="large">
                {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              Times in {userTz}
            </Caption1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        <TabList selectedValue={activeTab} onTabSelect={(_, d) => setActiveTab(d.value)}>
          <Tab value="upcoming">
            Upcoming
            {upcoming.length > 0 && (
              <Badge appearance="filled" color="brand" size="small" style={{ marginLeft: '6px' }}>
                {upcoming.length}
              </Badge>
            )}
          </Tab>
          <Tab value="past">
            Past
            {past.length > 0 && (
              <Badge appearance="outline" size="small" style={{ marginLeft: '6px' }}>
                {past.length}
              </Badge>
            )}
          </Tab>
        </TabList>
      </div>

      {/* Content */}
      <div className={styles.scrollArea}>
        {loadState === 'loading' && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <Spinner size="large" label="Loading sessions…" />
          </div>
        )}

        {loadState === 'error' && (
          <div style={{ padding: '16px', borderRadius: tokens.borderRadiusMedium,
            backgroundColor: '#FDE7E9', color: '#750B1C', maxWidth: '600px' }}>
            {loadError}
          </div>
        )}

        {loadState === 'ready' && bookings.length === 0 && (
          <div className={styles.emptyState}>
            <CalendarLtrRegular style={{ fontSize: '48px' }} />
            <Subtitle2>No sessions yet</Subtitle2>
            <Body2 style={{ textAlign: 'center', maxWidth: '320px' }}>
              {isInterviewer
                ? 'Set your availability so candidates can book sessions with you.'
                : 'Book a session with an interviewer to get started.'}
            </Body2>
            {!isInterviewer && (
              <Button as={Link} to="/discovery" appearance="primary" icon={<PeopleSearchRegular />}>
                Find Interviewers
              </Button>
            )}
          </div>
        )}

        {loadState === 'ready' && bookings.length > 0 && displayList.length === 0 && (
          <div className={styles.emptyState}>
            <CalendarLtrRegular style={{ fontSize: '36px' }} />
            <Body2>No {activeTab} sessions</Body2>
          </div>
        )}

        {loadState === 'ready' && displayList.length > 0 && (
          <div className={styles.list}>
            {displayList.map(b => (
              <BookingItem key={b.id} booking={b} isInterviewer={isInterviewer}
                onStatusUpdate={onStatusUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

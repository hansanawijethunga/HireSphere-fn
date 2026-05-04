import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  Spinner,
  Text,
  Title2,
  Title3,
  Subtitle2,
  Body1,
  Body2,
  Caption1,
} from '@fluentui/react-components';
import {
  SearchRegular,
  ChatRegular,
  CalendarLtrRegular,
  StarFilled,
  FilterRegular,
  DismissRegular,
  MoneyRegular,
} from '@fluentui/react-icons';
import { BookingModal } from '../components/BookingModal';
import { fetchInterviewers } from '../utils/searchApi';

const DOMAIN_OPTIONS    = ['All', 'Backend', 'Frontend', 'DevOps', 'AI/ML', 'Mobile'];
const EXPERIENCE_OPTIONS = ['All', 'Senior', 'Staff', 'Principal'];
const DEFAULT_FILTERS   = { domain: '', experienceLevel: '', maxPrice: '' };

const DOMAIN_COLOR = {
  Backend:  { bg: '#EDE7F6', color: '#5E35B1' },
  Frontend: { bg: '#E3F2FD', color: '#1565C0' },
  DevOps:   { bg: '#FFF3E0', color: '#E65100' },
  'AI/ML':  { bg: '#E8F5E9', color: '#2E7D32' },
  Mobile:   { bg: '#FCE4EC', color: '#AD1457' },
};

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
  filterBar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '160px',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    borderRadius: tokens.borderRadiusXLarge,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow 0.15s, transform 0.15s',
    ':hover': {
      transform: 'translateY(-2px)',
    },
  },
  cardBody: {
    padding: '20px',
    flex: 1,
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: tokens.borderRadiusCircular,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightBold,
    color: 'white',
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground}, #0050a0)`,
    flexShrink: 0,
    userSelect: 'none',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '16px',
  },
  stars: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  cardFooter: {
    display: 'flex',
    gap: '10px',
    padding: '0 20px 20px',
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
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '14px',
  },
});

function StarRating({ rating }) {
  const styles = useStyles();
  const full = Math.round(rating ?? 0);
  return (
    <div className={styles.stars}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarFilled key={i} style={{ fontSize: '13px', color: i < full ? '#FFB900' : tokens.colorNeutralStroke1 }} />
      ))}
      <Caption1 style={{ marginLeft: '4px', color: tokens.colorNeutralForeground2 }}>
        {rating?.toFixed(1)}
      </Caption1>
    </div>
  );
}

function InterviewerCard({ interviewer, onBook }) {
  const styles = useStyles();
  const emailPrefix = interviewer.email.split('@')[0];
  const initials    = emailPrefix.slice(0, 2).toUpperCase();
  const domainColor = DOMAIN_COLOR[interviewer.domain] ?? { bg: '#F0F0F0', color: '#444' };

  return (
    <Card className={styles.card}>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <div className={styles.avatar}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <Body1 weight="semibold" block
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {emailPrefix}
            </Body1>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
              <Badge appearance="filled" size="small"
                style={{ backgroundColor: domainColor.bg, color: domainColor.color }}>
                {interviewer.domain}
              </Badge>
              <Badge appearance="outline" size="small">{interviewer.experienceLevel}</Badge>
            </div>
          </div>
        </div>

        <div className={styles.meta}>
          <StarRating rating={interviewer.rating} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MoneyRegular style={{ color: tokens.colorNeutralForeground2 }} />
            <Title3 style={{ lineHeight: 1 }}>${interviewer.sessionPrice}</Title3>
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>/session</Caption1>
          </div>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <Button
          appearance="primary"
          icon={<CalendarLtrRegular />}
          onClick={() => onBook(interviewer)}
          style={{ flex: 1 }}
        >
          Book Session
        </Button>
        <Button
          as={Link}
          to={`/messages/${interviewer.cognitoSub}`}
          state={{ displayName: emailPrefix }}
          appearance="outline"
          icon={<ChatRegular />}
        >
          Message
        </Button>
      </div>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card style={{ borderRadius: tokens.borderRadiusXLarge, height: '200px' }}>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: tokens.colorNeutralBackground3 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '14px', width: '60%', borderRadius: '6px', background: tokens.colorNeutralBackground3 }} />
            <div style={{ height: '10px', width: '40%', borderRadius: '6px', background: tokens.colorNeutralBackground3 }} />
          </div>
        </div>
        <div style={{ height: '10px', width: '80%', borderRadius: '6px', background: tokens.colorNeutralBackground3 }} />
        <div style={{ height: '10px', width: '50%', borderRadius: '6px', background: tokens.colorNeutralBackground3 }} />
      </div>
    </Card>
  );
}

export function Discovery({ email, profileType }) {
  const styles = useStyles();
  const [filters, setFilters]           = useState(DEFAULT_FILTERS);
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [bookingTarget, setBookingTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchInterviewers(filters)
      .then(data => { if (!cancelled) { setInterviewers(Array.isArray(data) ? data : []); setLoading(false); }})
      .catch(err  => { if (!cancelled) { setError(err.message || 'Failed to load.'); setLoading(false); }});
    return () => { cancelled = true; };
  }, [filters]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Title2>Find Interviewers</Title2>
        <Body1 style={{ color: tokens.colorNeutralForeground2, marginTop: '4px' }}>
          Browse industry professionals and book a live technical simulation session.
        </Body1>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Label htmlFor="f-domain" size="small">Domain</Label>
          <Select id="f-domain" size="small" value={filters.domain || 'All'}
            onChange={e => setFilters(p => ({ ...p, domain: e.target.value === 'All' ? '' : e.target.value }))}>
            {DOMAIN_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </Select>
        </div>
        <div className={styles.filterGroup}>
          <Label htmlFor="f-exp" size="small">Experience</Label>
          <Select id="f-exp" size="small" value={filters.experienceLevel || 'All'}
            onChange={e => setFilters(p => ({ ...p, experienceLevel: e.target.value === 'All' ? '' : e.target.value }))}>
            {EXPERIENCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </Select>
        </div>
        <div className={styles.filterGroup}>
          <Label htmlFor="f-price" size="small">Max price / session</Label>
          <Input id="f-price" size="small" type="number" placeholder="Any" contentBefore="$"
            value={filters.maxPrice}
            onChange={e => setFilters(p => ({ ...p, maxPrice: e.target.value }))} />
        </div>
        {activeCount > 0 && (
          <Button appearance="subtle" icon={<DismissRegular />}
            onClick={() => setFilters(DEFAULT_FILTERS)}>
            Clear filters ({activeCount})
          </Button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!loading && (
            <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>
              {interviewers.length} interviewer{interviewers.length !== 1 ? 's' : ''} found
            </Caption1>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.scrollArea}>
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: tokens.borderRadiusMedium,
            backgroundColor: '#FDE7E9', color: '#750B1C', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {loading && (
          <div className={styles.grid}>
            {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && interviewers.length > 0 && (
          <div className={styles.grid}>
            {interviewers.map(iv => (
              <InterviewerCard key={iv.id} interviewer={iv}
                onBook={iv => setBookingTarget({ ...iv, name: iv.email.split('@')[0] })} />
            ))}
          </div>
        )}

        {!loading && !error && interviewers.length === 0 && (
          <div className={styles.emptyState}>
            <SearchRegular style={{ fontSize: '48px' }} />
            <Subtitle2>No interviewers found</Subtitle2>
            <Body2 style={{ textAlign: 'center', maxWidth: '320px' }}>
              Try adjusting your filters or clearing them to broaden your search.
            </Body2>
            <Button onClick={() => setFilters(DEFAULT_FILTERS)} icon={<FilterRegular />}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      <BookingModal
        isOpen={bookingTarget !== null}
        onClose={() => setBookingTarget(null)}
        interviewer={bookingTarget}
      />
    </div>
  );
}

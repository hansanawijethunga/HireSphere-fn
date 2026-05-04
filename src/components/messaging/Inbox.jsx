import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import {
  Avatar,
  Button,
  Spinner,
  Text,
  Title2,
  Subtitle2,
  Body1,
  Body2,
  Caption1,
} from '@fluentui/react-components';
import {
  ChatRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import messagingClient from '../../api/messagingClient';
import { getUserByCognitoSub } from '../../utils/searchApi';

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
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 32px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '760px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    borderRadius: tokens.borderRadiusXLarge,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    transition: 'all 0.12s',
    ':hover': {
      borderColor: tokens.colorBrandStroke1,
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  itemUnread: {
    borderColor: tokens.colorBrandStroke2,
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': {
      borderColor: tokens.colorBrandStroke1,
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  unreadDot: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralBackground1,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
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
  skeleton: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    borderRadius: tokens.borderRadiusXLarge,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

function formatTime(ms) {
  if (!ms) return '';
  const date = new Date(ms);
  const now  = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= today) {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  }
  const yesterday = new Date(today - 86400000);
  if (date >= yesterday) return 'Yesterday';
  const diff = Math.floor((now - date) / 86400000);
  if (diff < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function SkeletonItem() {
  const styles = useStyles();
  return (
    <div className={styles.skeleton}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: tokens.colorNeutralBackground3 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '13px', width: '40%', borderRadius: '6px', background: tokens.colorNeutralBackground3 }} />
        <div style={{ height: '11px', width: '70%', borderRadius: '6px', background: tokens.colorNeutralBackground3 }} />
      </div>
      <div style={{ height: '11px', width: '40px', borderRadius: '6px', background: tokens.colorNeutralBackground3 }} />
    </div>
  );
}

function ConversationItem({ message, userId, displayNames, onClick }) {
  const styles = useStyles();
  const otherId    = message.senderId === userId ? message.receiverId : message.senderId;
  const isOutgoing = message.senderId === userId;
  const isUnread   = !isOutgoing && !message.readAt;
  const snippet    = isOutgoing ? `You: ${message.content}` : message.content;
  const name       = displayNames[message.senderId] || message.senderId;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(otherId, name)}
      onKeyDown={e => e.key === 'Enter' && onClick(otherId, name)}
      className={`${styles.item} ${isUnread ? styles.itemUnread : ''}`}
    >
      <div className={styles.avatarWrap}>
        <Avatar name={name} size={40} color={isUnread ? 'brand' : 'neutral'} />
        {isUnread && <div className={styles.unreadDot} />}
      </div>
      <div className={styles.itemContent}>
        <div className={styles.itemMeta}>
          <Body1 weight={isUnread ? 'bold' : 'semibold'}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </Body1>
          <Caption1 style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }}>
            {formatTime(message.timestamp)}
          </Caption1>
        </div>
        <Caption1
          block
          style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: isUnread ? tokens.colorNeutralForeground1 : tokens.colorNeutralForeground2,
            fontWeight: isUnread ? tokens.fontWeightSemibold : tokens.fontWeightRegular,
            marginTop: '2px',
          }}
        >
          {snippet}
        </Caption1>
      </div>
    </div>
  );
}

export function Inbox({ userId }) {
  const styles    = useStyles();
  const navigate  = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [displayNames,  setDisplayNames]  = useState({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res  = await messagingClient.get('/api/messages/inbox');
      const data = Array.isArray(res.data) ? res.data : [];
      const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
      setConversations(sorted);

      const senderIds = [...new Set(sorted.map(m => m.senderId))];
      const resolved  = {};
      await Promise.all(senderIds.map(async id => {
        const user = await getUserByCognitoSub(id);
        if (user?.email) resolved[id] = user.email.split('@')[0];
      }));
      setDisplayNames(resolved);
    } catch {
      setError('Unable to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title2>Messages</Title2>
            <Body1 style={{ color: tokens.colorNeutralForeground2, marginTop: '4px' }}>
              Your recent conversations
            </Body1>
          </div>
          {!loading && (
            <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={load} size="small">
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.scrollArea}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: tokens.borderRadiusMedium,
            backgroundColor: '#FDE7E9', color: '#750B1C', marginBottom: '16px', maxWidth: '760px' }}>
            <span>{error}</span>
            <Button appearance="transparent" size="small" onClick={load}>Retry</Button>
          </div>
        )}

        {loading && (
          <div className={styles.list}>
            {[1, 2, 3, 4].map(i => <SkeletonItem key={i} />)}
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className={styles.emptyState}>
            <ChatRegular style={{ fontSize: '48px' }} />
            <Subtitle2>No messages yet</Subtitle2>
            <Body2 style={{ textAlign: 'center', maxWidth: '320px' }}>
              Start a conversation from an interviewer's profile or a session booking.
            </Body2>
          </div>
        )}

        {!loading && conversations.length > 0 && (
          <div className={styles.list}>
            {conversations.map((msg, i) => (
              <ConversationItem
                key={msg.roomId ?? i}
                message={msg}
                userId={userId}
                displayNames={displayNames}
                onClick={(id, name) => navigate(`/messages/${id}`, { state: { displayName: name } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

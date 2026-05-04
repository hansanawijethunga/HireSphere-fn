import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import {
  Avatar,
  Badge,
  Button,
  Spinner,
  Text,
  Subtitle2,
  Body1,
  Body2,
  Caption1,
} from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  SendRegular,
} from '@fluentui/react-icons';
import { fetchAuthSession } from 'aws-amplify/auth';
import messagingClient, { connectMessagingSocket, markMessagesRead } from '../../api/messagingClient';
import { getUserByCognitoSub } from '../../utils/searchApi';

// ── Notification sound ────────────────────────────────────────────────────────

function playNotificationSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ms) {
  if (!ms) return '';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms));
}

function formatDayLabel(ms) {
  const date  = new Date(ms);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= today) return 'Today';
  if (date >= new Date(today - 86400000)) return 'Yesterday';
  const diff = Math.floor((now - date) / 86400000);
  if (diff < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function groupByDay(messages) {
  const items = [];
  let currentDay = null;
  for (const msg of messages) {
    const day = new Date(msg.timestamp).toDateString();
    if (day !== currentDay) {
      items.push({ type: 'day', key: day, label: formatDayLabel(msg.timestamp) });
      currentDay = day;
    }
    items.push({ type: 'message', ...msg });
  }
  return items;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  chatHeader: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  daySeparator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '16px 0 8px',
  },
  daySepLine: {
    flex: 1,
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke2,
  },
  bubbleWrap: {
    display: 'flex',
    marginBottom: '2px',
  },
  bubbleMine: {
    justifyContent: 'flex-end',
  },
  bubbleOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '72%',
    padding: '10px 14px',
    borderRadius: '18px',
    lineHeight: '1.4',
  },
  bubbleMineStyle: {
    backgroundColor: tokens.colorBrandBackground,
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  bubbleOtherStyle: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralStroke2,
    borderBottomLeftRadius: '4px',
  },
  inputBar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    padding: '16px 24px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    resize: 'none',
    padding: '10px 14px',
    borderRadius: tokens.borderRadiusMedium,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralStroke1,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: tokens.fontSizeBase300,
    fontFamily: 'inherit',
    outline: 'none',
    lineHeight: '1.5',
    ':focus': {
      borderColor: tokens.colorBrandStroke1,
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '8px',
    color: tokens.colorNeutralForeground3,
  },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatWindow({ userId }) {
  const { targetUserId } = useParams();
  const { state }        = useLocation();
  const navigate         = useNavigate();
  const styles           = useStyles();

  const [messages,    setMessages]    = useState([]);
  const [newMessage,  setNewMessage]  = useState('');
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState('');
  const [sendError,   setSendError]   = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [displayName, setDisplayName] = useState(state?.displayName ?? '');

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Resolve display name
  useEffect(() => {
    if (!targetUserId || displayName) return;
    getUserByCognitoSub(targetUserId).then(user => {
      if (user?.email) setDisplayName(user.email.split('@')[0]);
    });
  }, [targetUserId]); // eslint-disable-line

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch history + socket
  useEffect(() => {
    if (!targetUserId) return;
    let cancelled = false;

    function onConnect()    { if (!cancelled) { setIsConnected(true); socketRef.current?.emit('join-chat', { targetUserId }); } }
    function onDisconnect() { if (!cancelled) setIsConnected(false); }
    function onReceive(msg) {
      if (cancelled || msg.senderId === userId) return;
      setMessages(prev => [...prev, msg]);
      playNotificationSound();
    }

    async function init() {
      setLoading(true);
      setLoadError('');
      try {
        const res = await messagingClient.get(`/api/messages/${targetUserId}`);
        if (!cancelled) {
          setMessages(Array.isArray(res.data) ? res.data : []);
          markMessagesRead(targetUserId).catch(() => {});
        }
      } catch {
        if (!cancelled) setLoadError('Unable to load messages. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;
      let token;
      try {
        const session = await fetchAuthSession();
        token = session.tokens?.idToken?.toString();
        if (!token) throw new Error('no token');
      } catch {
        if (!cancelled) setLoadError('Authentication error. Please sign in again.');
        return;
      }

      if (cancelled) return;
      const socket = connectMessagingSocket(token);
      socketRef.current = socket;
      socket.on('connect',         onConnect);
      socket.on('disconnect',      onDisconnect);
      socket.on('receive-message', onReceive);
      if (socket.connected) { setIsConnected(true); socket.emit('join-chat', { targetUserId }); }
    }

    init();
    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.off('connect',         onConnect);
        s.off('disconnect',      onDisconnect);
        s.off('receive-message', onReceive);
      }
    };
  }, [targetUserId, userId]); // eslint-disable-line

  function handleSend(e) {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !isConnected || !socketRef.current) return;
    setSendError('');
    const tempKey = `local-${Date.now()}-${Math.random()}`;
    setMessages(prev => [...prev, {
      roomId: tempKey, senderId: userId, receiverId: targetUserId,
      content, timestamp: Date.now(), _tempKey: tempKey,
    }]);
    setNewMessage('');
    inputRef.current?.focus();
    socketRef.current.emit('send-message', { targetUserId, content }, res => {
      if (!res?.ok) {
        setSendError('Message failed to send.');
        setMessages(prev => prev.filter(m => m._tempKey !== tempKey));
      }
    });
  }

  const grouped       = groupByDay(messages);
  const resolvedName  = displayName || targetUserId || '';

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <Button appearance="subtle" icon={<ArrowLeftRegular />} size="small"
          onClick={() => navigate('/messages')} aria-label="Back" />
        <Avatar name={resolvedName} size={36} color="brand" />
        <div className={styles.headerInfo}>
          <Body1 weight="semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resolvedName}
          </Body1>
          <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Direct message</Caption1>
        </div>
        <Badge
          appearance="filled"
          color={isConnected ? 'success' : 'warning'}
          size="small"
        >
          {isConnected ? 'Connected' : 'Connecting…'}
        </Badge>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {loadError && (
          <div style={{ padding: '12px 16px', borderRadius: tokens.borderRadiusMedium,
            backgroundColor: '#FDE7E9', color: '#750B1C', marginBottom: '12px' }}>
            {loadError}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
            <Spinner size="medium" label="Loading messages…" />
          </div>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <div className={styles.emptyState}>
            <Avatar name={resolvedName} size={56} color="brand" />
            <Body1 weight="semibold" style={{ marginTop: '8px' }}>Start the conversation</Body1>
            <Caption1>Send a message below — it'll arrive instantly.</Caption1>
          </div>
        )}

        {!loading && grouped.map(item =>
          item.type === 'day' ? (
            <div key={item.key} className={styles.daySeparator}>
              <div className={styles.daySepLine} />
              <Caption1 style={{ color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' }}>
                {item.label}
              </Caption1>
              <div className={styles.daySepLine} />
            </div>
          ) : (
            <div
              key={item._tempKey ?? `${item.roomId}-${item.timestamp}`}
              className={`${styles.bubbleWrap} ${item.senderId === userId ? styles.bubbleMine : styles.bubbleOther}`}
            >
              <div
                className={`${styles.bubble} ${item.senderId === userId ? styles.bubbleMineStyle : styles.bubbleOtherStyle}`}
              >
                <Text size={300} style={{ lineHeight: 1.5 }}>{item.content}</Text>
                <div style={{ textAlign: 'right', marginTop: '3px' }}>
                  <Caption1 style={{
                    color: item.senderId === userId ? 'rgba(255,255,255,0.65)' : tokens.colorNeutralForeground3,
                    fontSize: '10px',
                  }}>
                    {formatTime(item.timestamp)}
                  </Caption1>
                </div>
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputBar}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sendError && (
            <Caption1 style={{ color: '#750B1C' }} role="alert">{sendError}</Caption1>
          )}
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={newMessage}
              onChange={e => { setNewMessage(e.target.value); setSendError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              placeholder={isConnected ? 'Type a message…' : 'Connecting…'}
              disabled={!isConnected}
              className={styles.textarea}
              style={{ flex: 1 }}
            />
            <Button
              type="submit"
              appearance="primary"
              icon={<SendRegular />}
              disabled={!newMessage.trim() || !isConnected}
              aria-label="Send"
              style={{ flexShrink: 0 }}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

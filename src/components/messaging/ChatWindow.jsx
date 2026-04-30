import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import messagingClient, { connectMessagingSocket, markMessagesRead } from '../../api/messagingClient';
import { getUserByCognitoSub } from '../../utils/searchApi';

// ── Notification sound ────────────────────────────────────────────────────────

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
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

// ── Timestamp helpers ─────────────────────────────────────────────────────────

function formatChatTime(ms) {
  if (!ms) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(ms));
}

function formatDayLabel(ms) {
  const date = new Date(ms);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday - 86_400_000);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  const diffDays = Math.floor((now - date) / 86_400_000);
  if (diffDays < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(date);
}

// Group flat message array by calendar day for day-separator labels
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

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav({ email, profileType, signOut, displayName }) {
  const navigate = useNavigate();
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '?';

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/messages')}
          aria-label="Back to inbox"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Avatar + name */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
            <p className="text-xs text-slate-400">Direct message</p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            to="/messages"
            className="hidden rounded-md border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
          >
            Inbox
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Connection status pill ────────────────────────────────────────────────────

function ConnectionPill({ connected }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        connected
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-700'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'
        }`}
      />
      {connected ? 'Connected' : 'Connecting…'}
    </span>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, isMine }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isMine
            ? 'rounded-br-sm bg-brand-600 text-white'
            : 'rounded-bl-sm border border-slate-200 bg-white text-slate-900 shadow-sm'
        }`}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p
          className={`mt-1 text-right text-[10px] leading-none ${
            isMine ? 'text-brand-200' : 'text-slate-400'
          }`}
        >
          {formatChatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ── Day separator ─────────────────────────────────────────────────────────────

function DaySeparator({ label }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="flex-1 border-t border-slate-200" />
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );
}

// ── ChatWindow ────────────────────────────────────────────────────────────────

export function ChatWindow({ email, profileType, signOut, userId }) {
  const { targetUserId } = useParams();
  const { state } = useLocation();

  const [messages,     setMessages]     = useState([]);
  const [newMessage,   setNewMessage]   = useState('');
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [sendError,    setSendError]    = useState('');
  const [isConnected,  setIsConnected]  = useState(false);
  const [displayName,  setDisplayName]  = useState(state?.displayName ?? '');

  const socketRef  = useRef(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Resolve targetUserId → display name if not already passed via router state
  useEffect(() => {
    if (!targetUserId || displayName) return;
    getUserByCognitoSub(targetUserId).then((user) => {
      if (user?.email) setDisplayName(user.email.split('@')[0]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  // Always scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch history + connect socket
  useEffect(() => {
    if (!targetUserId) return;
    let cancelled = false;

    // Named handlers defined at effect scope so cleanup can remove them by reference
    function onConnectHandler() {
      if (cancelled) return;
      setIsConnected(true);
      socketRef.current?.emit('join-chat', { targetUserId });
    }

    function onDisconnectHandler() {
      if (!cancelled) setIsConnected(false);
    }

    function onReceiveMessage(message) {
      if (cancelled) return;
      // Skip own messages — already added optimistically on send
      if (message.senderId === userId) return;
      setMessages((prev) => [...prev, message]);
      playNotificationSound();
    }

    async function init() {
      // 1. Load chat history
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

      // 2. Get ID token for socket auth
      let token;
      try {
        const session = await fetchAuthSession();
        token = session.tokens?.idToken?.toString();
        if (!token) throw new Error('empty token');
      } catch {
        if (!cancelled) setLoadError('Authentication error. Please sign in again.');
        return;
      }

      if (cancelled) return;

      // 3. Connect (or reuse) socket
      const socket = connectMessagingSocket(token);
      socketRef.current = socket;

      socket.on('connect',         onConnectHandler);
      socket.on('disconnect',      onDisconnectHandler);
      socket.on('receive-message', onReceiveMessage);

      // If already connected, fire join-chat immediately
      if (socket.connected) {
        setIsConnected(true);
        socket.emit('join-chat', { targetUserId });
      }
    }

    init();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.off('connect',         onConnectHandler);
        s.off('disconnect',      onDisconnectHandler);
        s.off('receive-message', onReceiveMessage);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, userId]);

  // ── Send ────────────────────────────────────────────────────────────────────

  function handleSend(e) {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !isConnected || !socketRef.current) return;

    setSendError('');

    // Optimistic update — give the message a temporary local key
    const tempKey = `local-${Date.now()}-${Math.random()}`;
    const optimistic = {
      roomId:     tempKey,
      senderId:   userId,
      receiverId: targetUserId,
      content,
      timestamp:  Date.now(),
      _tempKey:   tempKey,
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');
    inputRef.current?.focus();

    socketRef.current.emit('send-message', { targetUserId, content }, (res) => {
      if (!res?.ok) {
        setSendError('Message failed to send. Please try again.');
        setMessages((prev) => prev.filter((m) => m._tempKey !== tempKey));
      }
    });
  }

  const grouped = groupByDay(messages);
  const resolvedName = displayName || targetUserId || '';
  const initials = resolvedName.slice(0, 2).toUpperCase() || '?';

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Nav
        email={email}
        profileType={profileType}
        signOut={signOut}
        displayName={resolvedName}
      />

      {/* Status bar */}
      <div className="border-b border-slate-100 bg-white px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="truncate text-xs text-slate-500">
            Chat with <span className="font-medium text-slate-700">{resolvedName}</span>
          </p>
          <ConnectionPill connected={isConnected} />
        </div>
      </div>

      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-2 px-4 py-6 sm:px-6">

          {/* Load error */}
          {loadError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
              {loadError}
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">
              <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading messages…
            </div>
          )}

          {/* Empty state */}
          {!loading && !loadError && messages.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                {resolvedName.slice(0, 2).toUpperCase() || '?'}
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">Start the conversation</p>
              <p className="mt-1 text-xs text-slate-400">
                Send a message below — it'll arrive instantly.
              </p>
            </div>
          )}

          {/* Message list with day separators */}
          {!loading && grouped.map((item) =>
            item.type === 'day' ? (
              <DaySeparator key={item.key} label={item.label} />
            ) : (
              <MessageBubble
                key={item._tempKey ?? `${item.roomId}-${item.timestamp}`}
                message={item}
                isMine={item.senderId === userId}
              />
            ),
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {sendError && (
            <p className="mb-2 text-xs text-rose-600" role="alert">{sendError}</p>
          )}
          <form onSubmit={handleSend} className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); setSendError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={isConnected ? 'Type a message…' : 'Connecting…'}
              disabled={!isConnected}
              className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

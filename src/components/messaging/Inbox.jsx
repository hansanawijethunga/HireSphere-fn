import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import messagingClient from '../../api/messagingClient';
import { getUserByCognitoSub } from '../../utils/searchApi';

// ── Timestamp ─────────────────────────────────────────────────────────────────

function formatInboxTime(ms) {
  if (!ms) return '';
  const date = new Date(ms);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday - 86_400_000);

  if (date >= startOfToday) {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(date);
  }
  if (date >= startOfYesterday) return 'Yesterday';
  const diffDays = Math.floor((now - date) / 86_400_000);
  if (diffDays < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav({ email, profileType, signOut }) {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-semibold text-white"
          >
            H
          </Link>
          <div>
            <p className="text-sm font-semibold text-slate-950">HireSphere</p>
            <p className="text-xs text-slate-500">Cloud interview simulation</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
            <span className="font-medium text-slate-950">{email}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span>{profileType}</span>
          </div>
          <Link
            to="/bookings"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            My Bookings
          </Link>
          <Link
            to="/messages"
            className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500"
          >
            Messages
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ConversationSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="h-11 w-11 shrink-0 rounded-full bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 rounded bg-slate-200" />
        <div className="h-3 w-52 rounded bg-slate-200" />
      </div>
      <div className="h-3 w-10 shrink-0 rounded bg-slate-200" />
    </div>
  );
}

// ── Conversation row ──────────────────────────────────────────────────────────

function ConversationItem({ message, userId, displayNames, onClick }) {
  const otherId = message.senderId === userId ? message.receiverId : message.senderId;
  const isOutgoing = message.senderId === userId;
  const isUnread = !isOutgoing && !message.readAt;
  const snippet = isOutgoing ? `You: ${message.content}` : message.content;
  const name = displayNames[message.senderId] || message.senderId;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onClick(otherId, name)}
      className={`flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
        isUnread ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
        {initials}
        {isUnread && (
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-brand-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-900'}`}>
          {name}
        </p>
        <p className={`mt-0.5 truncate text-xs ${isUnread ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
          {snippet}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="text-xs text-slate-400">{formatInboxTime(message.timestamp)}</p>
        {isUnread && (
          <span className="h-2 w-2 rounded-full bg-brand-600" />
        )}
      </div>
    </button>
  );
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

export function Inbox({ email, profileType, signOut, userId }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayNames, setDisplayNames] = useState({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await messagingClient.get('/api/messages/inbox');
      const data = Array.isArray(res.data) ? res.data : [];
      const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
      setConversations(sorted);

      // Resolve each unique senderId to a display name
      const senderIds = [...new Set(sorted.map((m) => m.senderId))];
      const resolved = {};
      await Promise.all(senderIds.map(async (id) => {
        const user = await getUserByCognitoSub(id);
        if (user?.email) {
          resolved[id] = user.email.split('@')[0];
        }
      }));
      setDisplayNames(resolved);
    } catch {
      setError('Unable to load inbox at this time. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav email={email} profileType={profileType} signOut={signOut} />

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">Your recent conversations</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={load}
              className="ml-4 shrink-0 text-xs font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <ConversationSkeleton key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <svg
              className="mb-3 h-10 w-10 text-slate-300"
              fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <p className="text-sm font-medium text-slate-500">No messages yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Start a conversation from a booking or interviewer profile
            </p>
          </div>
        )}

        {/* Conversation list */}
        {!loading && !error && conversations.length > 0 && (
          <div className="space-y-3">
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
      </main>
    </div>
  );
}

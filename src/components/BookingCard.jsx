import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addMinutes, isBefore, isAfter, subMinutes, format } from 'date-fns';
import { updateBookingStatus } from '../utils/bookingApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(utcIso) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(utcIso));
}

function formatDate(utcIso) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(utcIso));
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS = {
  Pending:   { dot: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  Confirmed: { dot: 'bg-emerald-400', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  Rejected:  { dot: 'bg-rose-400',    pill: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS[status] ?? STATUS.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cfg.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

// ─── Time-fenced join button ──────────────────────────────────────────────────

function JoinButton({ booking }) {
  const [phase, setPhase] = useState(() => getPhase(booking));

  function getPhase(b) {
    const start = new Date(b.scheduledAt);
    const end = addMinutes(start, b.durationMinutes ?? 60);
    const windowOpen = subMinutes(start, 5);
    const now = new Date();

    if (isBefore(now, windowOpen)) return 'future';
    if (isAfter(now, end)) return 'past';
    return 'active';
  }

  useEffect(() => {
    if (booking.status !== 'Confirmed') return;
    const id = setInterval(() => setPhase(getPhase(booking)), 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id, booking.scheduledAt, booking.durationMinutes, booking.status]);

  // Rejected bookings show the refund note inline — no join button needed
  if (booking.status === 'Rejected') return null;

  // Pending — waiting on interviewer
  if (booking.status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-600 cursor-not-allowed">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Awaiting confirmation
      </span>
    );
  }

  // Confirmed — past
  if (phase === 'past') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 cursor-default">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Completed
      </span>
    );
  }

  // Confirmed — future (more than 5 min away)
  if (phase === 'future') {
    return (
      <span
        title={`Join link opens 5 min before — ${format(new Date(booking.scheduledAt), 'MMM d, h:mm a')}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        Starts {format(new Date(booking.scheduledAt), 'h:mm a')}
      </span>
    );
  }

  // Confirmed — active window (≤5 min before start through end)
  return (
    <Link
      to={`/room/${booking.id}`}
      state={{ booking }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      Join Interview
    </Link>
  );
}

// ─── BookingCard ──────────────────────────────────────────────────────────────

export function BookingCard({ booking, isInterviewer, onStatusUpdate }) {
  const [loading, setLoading] = useState(null);
  const [actionError, setActionError] = useState('');

  const date = new Date(booking.scheduledAt);
  const canAct = isInterviewer && booking.status === 'Pending';

  async function handleAction(status) {
    setLoading(status);
    setActionError('');
    try {
      const updated = await updateBookingStatus(booking.id, status);
      onStatusUpdate(updated);
    } catch (err) {
      setActionError(err.message || 'Action failed. Please try again.');
      setLoading(null);
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        {/* Calendar tile + info */}
        <div className="flex items-start gap-4">
          <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-slate-200 bg-slate-50 py-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {date.toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-2xl font-bold leading-tight text-slate-900">
              {date.getDate()}
            </span>
            <span className="text-xs text-slate-400">
              {date.toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">{formatTime(booking.scheduledAt)}</p>
              <StatusBadge status={booking.status} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {formatDate(booking.scheduledAt)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {booking.durationMinutes} min session
              <span className="mx-1.5 text-slate-300">·</span>
              {booking.status === 'Rejected' ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Payment refunded
                </span>
              ) : (
                <>
                  Payment:{' '}
                  <span className={booking.paymentStatus === 'Paid' ? 'font-medium text-emerald-600' : 'text-slate-600'}>
                    {booking.paymentStatus}
                  </span>
                </>
              )}
            </p>
            <p className="mt-1.5 font-mono text-xs text-slate-300">
              #{booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Right-side actions */}
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">

          {/* Join button (time-fenced, Confirmed only) */}
          <JoinButton booking={booking} />

          {/* Interviewer confirm/reject (Pending only) */}
          {canAct && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAction('Rejected')}
                disabled={!!loading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === 'Rejected' && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleAction('Confirmed')}
                disabled={!!loading}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === 'Confirmed' && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Confirm
              </button>
            </div>
          )}

          {actionError && (
            <p className="max-w-[220px] text-right text-xs text-rose-600" role="alert">
              {actionError}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

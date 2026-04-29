import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyBookings } from '../utils/bookingApi';
import { BookingCard } from '../components/BookingCard';

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-16 w-14 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-5 w-20 rounded-full bg-slate-200" />
          </div>
          <div className="h-3 w-44 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

// ─── Section (Upcoming / Past) ────────────────────────────────────────────────

function BookingSection({ title, count, bookings, isInterviewer, emptyLabel, onStatusUpdate }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {count}
        </span>
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              isInterviewer={isInterviewer}
              onStatusUpdate={onStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Bookings({ email, profileType, signOut }) {
  const [bookings, setBookings] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [loadError, setLoadError] = useState('');

  const isInterviewer = profileType === 'Interviewer';
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!profileType) return;
    setLoadState('loading');
    fetchMyBookings(profileType)
      .then((data) => {
        setBookings(data);
        setLoadState('ready');
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to load bookings.');
        setLoadState('error');
      });
  }, [profileType]);

  function handleStatusUpdate(updatedBooking) {
    setBookings((prev) => prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b)));
  }

  const now = new Date();
  const upcoming = bookings
    .filter((b) => new Date(b.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const past = bookings
    .filter((b) => new Date(b.scheduledAt) <= now)
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Nav ── */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-semibold text-white"
            >
              H
            </Link>
            <div>
              <p className="text-sm font-semibold text-slate-950">HireSphere</p>
              <p className="text-xs text-slate-500">My Bookings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {email && <span className="hidden text-sm text-slate-600 sm:block">{email}</span>}
            <Link
              to="/dashboard"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Dashboard
            </Link>
            {signOut && (
              <button
                type="button"
                onClick={signOut}
                className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">

        {/* ── Page header ── */}
        <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">My Bookings</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isInterviewer
                ? 'Sessions booked with you. Confirm or reject pending requests.'
                : 'Your scheduled interview sessions.'}
            </p>
          </div>
          {/* Pending badge for interviewers */}
          {isInterviewer && loadState === 'ready' && pendingCount > 0 && (
            <span className="inline-flex items-center self-start rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
              {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <p className="mb-8 text-xs text-slate-400">All times shown in {userTz}</p>

        {/* ── Loading ── */}
        {loadState === 'loading' && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Error ── */}
        {loadState === 'error' && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {loadError}
          </div>
        )}

        {/* ── Empty state ── */}
        {loadState === 'ready' && bookings.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-7 w-7 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
                />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-800">No bookings yet</p>
            <p className="mt-1.5 max-w-xs text-sm text-slate-500">
              {isInterviewer
                ? 'Once candidates book sessions with you, they will appear here.'
                : 'Book a session with an interviewer to get started.'}
            </p>
            {!isInterviewer && (
              <Link
                to="/discovery"
                className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Find Interviewers
              </Link>
            )}
          </div>
        )}

        {/* ── Upcoming + Past sections ── */}
        {loadState === 'ready' && bookings.length > 0 && (
          <div className="space-y-10">
            <BookingSection
              title="Upcoming"
              count={upcoming.length}
              bookings={upcoming}
              isInterviewer={isInterviewer}
              emptyLabel="No upcoming sessions."
              onStatusUpdate={handleStatusUpdate}
            />
            {past.length > 0 && (
              <>
                <div className="border-t border-slate-200" />
                <BookingSection
                  title="Past"
                  count={past.length}
                  bookings={past}
                  isInterviewer={isInterviewer}
                  emptyLabel="No past sessions."
                  onStatusUpdate={handleStatusUpdate}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

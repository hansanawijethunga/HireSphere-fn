import { Link } from 'react-router-dom';
import { useUnreadCount } from '../hooks/useUnreadCount';

function StatCard({ label, value, detail }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </article>
  );
}

const STATIC_STATS = [
  { label: 'Simulations', value: '0', detail: 'Ready to schedule' },
  { label: 'Skill tracks', value: '4', detail: 'Frontend, backend, cloud, systems' },
];

export function Dashboard({ email, profileType, signOut, userId }) {
  const unreadCount = useUnreadCount(userId);
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-semibold text-white"
              to="/dashboard"
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
            {profileType === 'Interviewer' ? (
              <Link
                className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                to="/availability"
              >
                My Availability
              </Link>
            ) : (
              <Link
                className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                to="/discovery"
              >
                Find Interviewers
              </Link>
            )}
            <Link
              className="rounded-md border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              to="/bookings"
            >
              My Bookings
            </Link>
            <Link
              className="relative rounded-md border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              to="/messages"
            >
              Messages
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              className="rounded-md border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              to="/profile/edit"
            >
              Edit Profile
            </Link>
            <button
              className="rounded-md bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              onClick={signOut}
              type="button"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-700">HireSphere Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Technical interview workspace
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Signed in as {email}. This authenticated shell is ready for interview
                simulation workflows once the microservices backend is connected.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-md border border-brand-100 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              {profileType}
            </span>
          </div>
        </section>

        {profileType === 'Interviewer' ? (
          <section className="mt-6 rounded-lg border border-brand-100 bg-gradient-to-r from-brand-600 to-brand-700 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-100">Get discovered by candidates</p>
                <h2 className="mt-1 text-xl font-bold text-white">Set your weekly availability</h2>
                <p className="mt-1.5 text-sm text-brand-200">
                  Define the hours you are open each week so candidates can book sessions with you.
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-600"
                to="/availability"
              >
                My Availability
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-lg border border-brand-100 bg-gradient-to-r from-brand-600 to-brand-700 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-100">Ready to practice?</p>
                <h2 className="mt-1 text-xl font-bold text-white">Browse interviewers and book a session</h2>
                <p className="mt-1.5 text-sm text-brand-200">
                  Filter by domain, experience level, and price to find the right match.
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-600"
                to="/discovery"
              >
                Find Interviewers
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {STATIC_STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
          <StatCard detail="Used for role-based journeys" label="Profile" value={profileType} />
        </section>
      </main>
    </div>
  );
}

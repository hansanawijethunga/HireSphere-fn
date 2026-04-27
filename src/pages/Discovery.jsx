import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchInterviewers } from '../utils/searchApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAIN_OPTIONS = ['All', 'Backend', 'Frontend', 'DevOps', 'AI/ML', 'Mobile'];
const EXPERIENCE_OPTIONS = ['All', 'Senior', 'Staff', 'Principal'];
const DEFAULT_FILTERS = { domain: '', experienceLevel: '', maxPrice: '' };

const DOMAIN_BADGE = {
  Backend: 'bg-violet-50 text-violet-700 ring-violet-200',
  Frontend: 'bg-sky-50 text-sky-700 ring-sky-200',
  DevOps: 'bg-orange-50 text-orange-700 ring-orange-200',
  'AI/ML': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Mobile: 'bg-pink-50 text-pink-700 ring-pink-200',
};

const EXPERIENCE_BADGE = {
  Senior: 'bg-brand-50 text-brand-700 ring-brand-100',
  Staff: 'bg-amber-50 text-amber-700 ring-amber-200',
  Principal: 'bg-rose-50 text-rose-700 ring-rose-200',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }) {
  const stars = Math.round(rating ?? 0);
  return (
    <div className="flex items-center gap-1" aria-label={`Rating: ${rating?.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < stars ? 'text-amber-400' : 'text-slate-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-0.5 text-xs font-medium text-slate-500">{rating?.toFixed(1)}</span>
    </div>
  );
}

function Badge({ label, colorClass }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${colorClass}`}
    >
      {label}
    </span>
  );
}

function InterviewerCard({ interviewer, onBook }) {
  const emailPrefix = interviewer.email.split('@')[0];
  const initials = emailPrefix.slice(0, 2).toUpperCase();

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-brand-200 hover:shadow-md">
      <div className="flex items-start gap-3.5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white select-none"
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900" title={emailPrefix}>
            {emailPrefix}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge
              label={interviewer.domain}
              colorClass={DOMAIN_BADGE[interviewer.domain] ?? 'bg-slate-50 text-slate-700 ring-slate-200'}
            />
            <Badge
              label={interviewer.experienceLevel}
              colorClass={EXPERIENCE_BADGE[interviewer.experienceLevel] ?? 'bg-slate-50 text-slate-700 ring-slate-200'}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <StarRating rating={interviewer.rating} />
        <p className="text-base font-bold text-slate-900">
          ${interviewer.sessionPrice}
          <span className="ml-0.5 text-xs font-normal text-slate-400">/session</span>
        </p>
      </div>

      <button
        className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        onClick={() => onBook(interviewer.id)}
        type="button"
      >
        Book Session
      </button>
    </article>
  );
}

function SelectFilter({ id, label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <select
        id={id}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        value={value || 'All'}
        onChange={(e) => onChange(e.target.value === 'All' ? '' : e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function PriceFilter({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="maxPrice" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Max Price / session
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
          $
        </span>
        <input
          id="maxPrice"
          type="number"
          min={0}
          step={10}
          placeholder="Any price"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm text-slate-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
    </div>
  );
}

function FilterSidebar({ filters, onChange, onReset }) {
  return (
    <aside className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-brand-600 hover:text-brand-500 focus:outline-none"
        >
          Reset all
        </button>
      </div>

      <SelectFilter
        id="sidebar-domain"
        label="Domain"
        value={filters.domain}
        options={DOMAIN_OPTIONS}
        onChange={(v) => onChange('domain', v)}
      />

      <SelectFilter
        id="sidebar-experience"
        label="Experience Level"
        value={filters.experienceLevel}
        options={EXPERIENCE_OPTIONS}
        onChange={(v) => onChange('experienceLevel', v)}
      />

      <PriceFilter value={filters.maxPrice} onChange={(v) => onChange('maxPrice', v)} />
    </aside>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3.5">
        <div className="h-11 w-11 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/5 rounded bg-slate-200" />
          <div className="flex gap-1.5">
            <div className="h-5 w-16 rounded-md bg-slate-200" />
            <div className="h-5 w-14 rounded-md bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        <div className="h-3.5 w-24 rounded bg-slate-200" />
        <div className="h-4 w-14 rounded bg-slate-200" />
      </div>
      <div className="mt-4 h-10 w-full rounded-lg bg-slate-200" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Discovery({ email, profileType, signOut }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchInterviewers(filters)
      .then((data) => {
        if (!cancelled) {
          setInterviewers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load interviewers.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
  }

  function handleBook(id) {
    console.log('Book session for interviewer ID:', id);
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Nav ── */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-semibold text-white"
            >
              H
            </Link>
            <div>
              <p className="text-sm font-semibold text-slate-950">HireSphere</p>
              <p className="text-xs text-slate-500">Discovery Dashboard</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center">
            {email && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                <span className="font-medium text-slate-950">{email}</span>
                {profileType && (
                  <>
                    <span className="mx-2 text-slate-300">|</span>
                    <span>{profileType}</span>
                  </>
                )}
              </div>
            )}
            <Link
              to="/dashboard"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Dashboard
            </Link>
            {signOut && (
              <button
                type="button"
                onClick={signOut}
                className="rounded-md bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero strip ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Find an Interviewer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse industry professionals and book a live technical simulation session.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Mobile filter bar ── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
          <SelectFilter
            id="mobile-domain"
            label="Domain"
            value={filters.domain}
            options={DOMAIN_OPTIONS}
            onChange={(v) => handleFilterChange('domain', v)}
          />
          <SelectFilter
            id="mobile-experience"
            label="Experience"
            value={filters.experienceLevel}
            options={EXPERIENCE_OPTIONS}
            onChange={(v) => handleFilterChange('experienceLevel', v)}
          />
          <div className="col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <PriceFilter
                value={filters.maxPrice}
                onChange={(v) => handleFilterChange('maxPrice', v)}
              />
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="mb-0.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Desktop layout: sidebar + grid ── */}
        <div className="flex gap-8">
          {/* Sidebar (lg+) */}
          <div className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <FilterSidebar filters={filters} onChange={handleFilterChange} onReset={handleReset} />
            </div>
          </div>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            {/* Results meta row */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {loading
                  ? 'Searching…'
                  : `${interviewers.length} interviewer${interviewers.length !== 1 ? 's' : ''} found`}
              </p>
              {activeFilterCount > 0 && !loading && (
                <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            {/* Loading skeletons */}
            {loading && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Results grid */}
            {!loading && !error && interviewers.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {interviewers.map((interviewer) => (
                  <InterviewerCard
                    key={interviewer.id}
                    interviewer={interviewer}
                    onBook={handleBook}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && interviewers.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
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
                      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-base font-semibold text-slate-800">No interviewers found</p>
                <p className="mt-1.5 max-w-xs text-sm text-slate-500">
                  Try adjusting your filters or clearing them to broaden your search.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

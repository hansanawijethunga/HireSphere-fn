import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { fetchAvailabilityRules, saveAvailabilityRules } from '../utils/bookingApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_RULES = DAYS.map((_, i) => ({
  dayOfWeek: i,
  available: i >= 1 && i <= 5,
  startTime: '09:00',
  endTime: '17:00',
}));

// ─── Timezone helpers ─────────────────────────────────────────────────────────

function localTimeToUtc(localHHmm) {
  const [h, m] = localHHmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function utcTimeToLocal(utcHHmm) {
  const [h, m] = utcHHmm.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getDuration(startHHmm, endHHmm) {
  if (!startHHmm || !endHHmm) return null;
  const [sh, sm] = startHHmm.split(':').map(Number);
  const [eh, em] = endHHmm.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

function isEndBeforeStart(startHHmm, endHHmm) {
  const [sh, sm] = startHHmm.split(':').map(Number);
  const [eh, em] = endHHmm.split(':').map(Number);
  return eh * 60 + em <= sh * 60 + sm;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-brand-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Day row ──────────────────────────────────────────────────────────────────

function DayRow({ rule, dayName, isSaving, onToggle, onTimeChange }) {
  const invalid = rule.available && isEndBeforeStart(rule.startTime, rule.endTime);
  const duration = !invalid ? getDuration(rule.startTime, rule.endTime) : null;

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity ${
        rule.available ? 'border-slate-200' : 'border-slate-100 opacity-50'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Day name + toggle */}
        <div className="flex w-36 shrink-0 items-center gap-3">
          <Toggle checked={rule.available} onChange={onToggle} disabled={isSaving} />
          <span className="text-sm font-semibold text-slate-800">{dayName}</span>
        </div>

        {/* Time inputs or unavailable label */}
        {rule.available ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor={`start-${rule.dayOfWeek}`}
                className="text-xs font-medium text-slate-500"
              >
                From
              </label>
              <input
                id={`start-${rule.dayOfWeek}`}
                type="time"
                value={rule.startTime}
                disabled={isSaving}
                onChange={(e) => onTimeChange('startTime', e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor={`end-${rule.dayOfWeek}`}
                className="text-xs font-medium text-slate-500"
              >
                To
              </label>
              <input
                id={`end-${rule.dayOfWeek}`}
                type="time"
                value={rule.endTime}
                disabled={isSaving}
                onChange={(e) => onTimeChange('endTime', e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {invalid ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-600">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                End must be after start
              </span>
            ) : duration ? (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
                {duration}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Unavailable</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Availability({ email, profileType, signOut }) {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [loadState, setLoadState] = useState('loading');
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    fetchAvailabilityRules()
      .then((savedRules) => {
        if (savedRules.length > 0) {
          const ruleMap = new Map(savedRules.map((r) => [r.dayOfWeek, r]));
          setRules(
            DEFAULT_RULES.map((def) => {
              const saved = ruleMap.get(def.dayOfWeek);
              if (saved) {
                return {
                  ...def,
                  available: true,
                  startTime: utcTimeToLocal(saved.startTime),
                  endTime: utcTimeToLocal(saved.endTime),
                };
              }
              return { ...def, available: false };
            }),
          );
        }
        setLoadState('ready');
      })
      .catch(() => setLoadState('ready'));
  }, []);

  function toggleDay(i) {
    setRules((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, available: !r.available } : r)),
    );
  }

  function updateTime(i, field, value) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function handleSave() {
    const firstInvalid = rules.find(
      (r) => r.available && isEndBeforeStart(r.startTime, r.endTime),
    );
    if (firstInvalid) {
      setSaveError(`Fix the time range for ${DAYS[firstInvalid.dayOfWeek]} before saving.`);
      setSaveState('error');
      return;
    }

    setSaveState('saving');
    setSaveError('');

    const payload = rules
      .filter((r) => r.available)
      .map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: localTimeToUtc(r.startTime),
        endTime: localTimeToUtc(r.endTime),
      }));

    try {
      await saveAvailabilityRules(payload);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save. Please try again.');
      setSaveState('error');
    }
  }

  // Redirect candidates — wait for profileType to resolve before deciding
  if (profileType === null && loadState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (profileType && profileType !== 'Interviewer') {
    return <Navigate to="/dashboard" replace />;
  }

  const isSaving = saveState === 'saving';
  const availableCount = rules.filter((r) => r.available).length;

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
              <p className="text-xs text-slate-500">Availability</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {email && (
              <span className="hidden text-sm text-slate-600 sm:block">{email}</span>
            )}
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
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Weekly Availability
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Define the hours you are open for live interview sessions each week.
            </p>
          </div>
          {loadState === 'ready' && (
            <span className="mt-2 inline-flex items-center self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:mt-0">
              {availableCount} day{availableCount !== 1 ? 's' : ''} active
            </span>
          )}
        </div>

        {/* ── Timezone banner ── */}
        <div className="my-6 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Times are displayed in your local timezone{' '}
            <strong className="font-semibold">({userTz})</strong> and automatically converted to
            UTC before being stored.
          </span>
        </div>

        {/* ── Loading ── */}
        {loadState === 'loading' && (
          <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        )}

        {/* ── Day rows ── */}
        {loadState === 'ready' && (
          <>
            <div className="space-y-3">
              {rules.map((rule, i) => (
                <DayRow
                  key={rule.dayOfWeek}
                  rule={rule}
                  dayName={DAYS[i]}
                  isSaving={isSaving}
                  onToggle={() => toggleDay(i)}
                  onTimeChange={(field, value) => updateTime(i, field, value)}
                />
              ))}
            </div>

            {/* ── Footer ── */}
            <div className="mt-8 flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="text-sm">
                {saveState === 'error' && saveError && (
                  <p className="flex items-center gap-1.5 text-rose-600">
                    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {saveError}
                  </p>
                )}
                {saveState === 'success' && (
                  <p className="flex items-center gap-1.5 font-medium text-emerald-600">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Availability saved successfully.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </>
                ) : (
                  'Save Availability'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

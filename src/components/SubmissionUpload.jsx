import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import submissionClient, { isCircuitOpen } from '../api/submissionClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    (error?.isCircuitOpen ? 'Service temporarily unavailable. Please try again shortly.' : null) ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function timeAgo(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Date.now() - date.getTime() > SEVEN_DAYS_MS) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }).format(date);
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

function SubmissionTimes({ submission }) {
  if (!submission?.createdAt) return null;

  const submitted = timeAgo(submission.createdAt);
  const updated   = submission.updatedAt && submission.updatedAt !== submission.createdAt
    ? timeAgo(submission.updatedAt)
    : null;

  return (
    <p className="text-xs text-slate-400">
      Submitted <span className="font-medium text-slate-500">{submitted}</span>
      {updated && (
        <>
          <span className="mx-1.5">·</span>
          Updated <span className="font-medium text-slate-500">{updated}</span>
        </>
      )}
    </p>
  );
}

function isValidGithubUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'github.com' && u.pathname.split('/').filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }) {
  const cls = size === 'lg' ? 'h-5 w-5 border-2' : 'h-3.5 w-3.5 border-2';
  return <span className={`inline-block animate-spin rounded-full border-current border-t-transparent ${cls}`} aria-hidden="true" />;
}

function InlineError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-rose-600" role="alert">{msg}</p>;
}

function CircuitBanner() {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span><strong className="font-semibold">Submission system temporarily unavailable.</strong> Please try again in a moment.</span>
    </div>
  );
}

function SectionCard({ title, icon, badge, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
        {icon}
        <h3 className="flex-1 text-sm font-semibold text-slate-800">{title}</h3>
        {badge}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, loading, variant = 'ghost', children }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    ghost:   'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:ring-slate-400',
    primary: 'bg-brand-600 text-white hover:bg-brand-500 focus:ring-brand-500',
    danger:  'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 focus:ring-rose-400',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]}`}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function ReadOnlyBadge() {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      View only
    </span>
  );
}

function EmptyHint({ children }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
      {children}
    </p>
  );
}

// ─── GitHub section ───────────────────────────────────────────────────────────

function GithubSection({ bookingId, submission, onUpdate, disabled, readOnly }) {
  const hasLink = !!submission?.githubUrl;
  const [mode,     setMode]     = useState('view');
  const [urlInput, setUrlInput] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [removing, setRemoving] = useState(false);
  const [err,      setErr]      = useState('');

  function startEdit() {
    setUrlInput(submission?.githubUrl ?? '');
    setErr('');
    setMode('edit');
  }

  async function handleSave() {
    if (!isValidGithubUrl(urlInput)) {
      setErr('Enter a valid GitHub URL (e.g. https://github.com/owner/repo).');
      return;
    }
    setSaving(true); setErr('');
    try {
      const res = await submissionClient.put(`/api/submissions/${bookingId}/github`, { githubUrl: urlInput });
      onUpdate(res.data);
      setMode('view');
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true); setErr('');
    try {
      const res = await submissionClient.delete(`/api/submissions/${bookingId}/github`);
      onUpdate(res.data);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setRemoving(false);
    }
  }

  const githubIcon = (
    <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );

  return (
    <SectionCard title="GitHub Repository" icon={githubIcon} badge={readOnly ? <ReadOnlyBadge /> : null}>
      {/* Linked — show details */}
      {hasLink && (mode === 'view' || readOnly) && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Repository</p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-900">{submission.githubUrl}</p>
            {submission.githubCommitHash && (
              <p className="mt-1 font-mono text-xs text-slate-400">
                Commit: {submission.githubCommitHash.slice(0, 10)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionBtn onClick={() => window.open(submission.githubUrl, '_blank', 'noopener,noreferrer')} disabled={disabled}>
              Open ↗
            </ActionBtn>
            {submission.githubCommitHash && (
              <ActionBtn
                onClick={() => window.open(`${submission.githubUrl}/tree/${submission.githubCommitHash}`, '_blank', 'noopener,noreferrer')}
                disabled={disabled}
                title={`Browse files at commit ${submission.githubCommitHash}`}
              >
                Open at commit ↗
              </ActionBtn>
            )}
            {!readOnly && (
              <>
                <ActionBtn onClick={startEdit} disabled={disabled || removing}>Edit</ActionBtn>
                <ActionBtn onClick={handleRemove} loading={removing} disabled={disabled} variant="danger">Remove</ActionBtn>
              </>
            )}
          </div>
          <InlineError msg={err} />
        </div>
      )}

      {/* Edit / add form — candidate only */}
      {!readOnly && (mode === 'edit' || !hasLink) && (
        <div className="space-y-3">
          <div>
            <label htmlFor="github-url-input" className="mb-1.5 block text-xs font-medium text-slate-600">
              {hasLink ? 'Update repository URL' : 'Link a GitHub repository'}
            </label>
            <input
              id="github-url-input"
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setErr(''); }}
              placeholder="https://github.com/owner/repo"
              disabled={disabled || saving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <InlineError msg={err} />
          </div>
          <div className="flex gap-2">
            <ActionBtn onClick={handleSave} loading={saving} disabled={disabled || !urlInput.trim()} variant="primary">
              {hasLink ? 'Update' : 'Link Repository'}
            </ActionBtn>
            {hasLink && (
              <ActionBtn onClick={() => { setMode('view'); setErr(''); }} disabled={saving}>Cancel</ActionBtn>
            )}
          </div>
        </div>
      )}

      {/* No link yet — read-only view (interviewer) */}
      {readOnly && !hasLink && (
        <EmptyHint>No GitHub repository linked by the candidate.</EmptyHint>
      )}
    </SectionCard>
  );
}

// ─── File section ─────────────────────────────────────────────────────────────

function FileSection({ bookingId, submission, type, label, onUpdate, disabled, readOnly }) {
  const s3Key      = type === 'solution' ? submission?.solutionS3Key : submission?.evaluationS3Key;
  const hasFile    = !!s3Key;
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [viewing,   setViewing]   = useState(false);
  const [removing,  setRemoving]  = useState(false);
  const [err,       setErr]       = useState('');

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true); setErr('');
    try {
      const urlRes = await submissionClient.post('/api/submissions/upload-url', {
        bookingId,
        fileName:   file.name,
        fileType:   file.type || 'application/octet-stream',
        uploadType: type,
      });

      const s3Res = await fetch(urlRes.data.uploadUrl, {
        method:  'PUT',
        body:    file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!s3Res.ok) throw new Error(`S3 upload failed (${s3Res.status})`);

      const refreshed = await submissionClient.get(`/api/submissions/${bookingId}`);
      onUpdate(refreshed.data);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleView() {
    setViewing(true); setErr('');
    try {
      const res = await submissionClient.get(`/api/submissions/${bookingId}/file-url?type=${type}`);
      window.open(res.data.viewUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setViewing(false);
    }
  }

  async function handleRemove() {
    setRemoving(true); setErr('');
    try {
      const res = await submissionClient.delete(`/api/submissions/${bookingId}/file?type=${type}`);
      onUpdate(res.data.submission);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setRemoving(false);
    }
  }

  const uploadIcon = (
    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );

  return (
    <SectionCard title={label} icon={uploadIcon} badge={readOnly ? <ReadOnlyBadge /> : null}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} disabled={disabled || uploading} />

      {hasFile ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-800">{label} submitted</p>
              <p className="truncate font-mono text-xs text-emerald-600">{s3Key.split('/').pop()}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionBtn onClick={handleView} loading={viewing} disabled={disabled || uploading || removing}>
              View
            </ActionBtn>
            {!readOnly && (
              <>
                <ActionBtn onClick={() => fileInputRef.current?.click()} loading={uploading} disabled={disabled || viewing || removing}>
                  Replace
                </ActionBtn>
                <ActionBtn onClick={handleRemove} loading={removing} disabled={disabled || uploading || viewing} variant="danger">
                  Remove
                </ActionBtn>
              </>
            )}
          </div>
          <InlineError msg={err} />
        </div>
      ) : readOnly ? (
        <EmptyHint>
          {type === 'solution' ? 'No solution file uploaded by the candidate.' : 'No evaluation report uploaded yet.'}
        </EmptyHint>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <><Spinner size="lg" /><p className="mt-2 text-sm font-medium text-slate-600">Uploading…</p></>
            ) : (
              <>
                <svg className="mb-2 h-8 w-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-semibold text-slate-700">Click to upload {label.toLowerCase()}</p>
                <p className="mt-1 text-xs text-slate-400">.zip, .tar.gz, .pdf, or any file</p>
              </>
            )}
          </button>
          <InlineError msg={err} />
        </div>
      )}
    </SectionCard>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  Submitted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pending:   'bg-amber-50 text-amber-700 ring-amber-200',
};

function StatusBadge({ status }) {
  if (!status) return null;
  const cls = STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
// profileType: 'Candidate' | 'Interviewer'
//
// Candidate  → edits GitHub + solution file; views evaluation (read-only)
// Interviewer → views GitHub + solution (read-only); edits evaluation file

export function SubmissionUpload({ bookingId, profileType }) {
  const isInterviewer = profileType === 'Interviewer';

  const [submission,        setSubmission]        = useState(undefined);
  const [loadingSubmission, setLoadingSubmission] = useState(true);
  const [loadError,         setLoadError]         = useState('');
  const [circuitOpen,       setCircuitOpen]       = useState(() => isCircuitOpen());

  async function loadSubmission() {
    setLoadingSubmission(true); setLoadError('');
    try {
      const res = await submissionClient.get(`/api/submissions/${bookingId}`);
      setSubmission(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setSubmission(null);
      } else {
        if (err?.isCircuitOpen) setCircuitOpen(true);
        setLoadError(getErrorMessage(err));
      }
    } finally {
      setLoadingSubmission(false);
    }
  }

  useEffect(() => {
    setCircuitOpen(isCircuitOpen());
    loadSubmission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            {isInterviewer ? 'Submission Review & Evaluation' : 'Submission Workspace'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {isInterviewer
              ? 'Review the candidate\'s submission and upload your evaluation report.'
              : 'Submit your solution via GitHub or file upload. View interviewer feedback below.'}
          </p>
          {submission && <SubmissionTimes submission={submission} />}
        </div>
        {submission && <StatusBadge status={submission.status} />}
      </div>

      {circuitOpen && <CircuitBanner />}

      {/* Loading */}
      {loadingSubmission && (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
          <Spinner size="lg" /><span>Loading submission…</span>
        </div>
      )}

      {/* Load error */}
      {!loadingSubmission && loadError && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{loadError}</span>
          <button type="button" onClick={loadSubmission} className="ml-4 shrink-0 text-xs font-semibold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Workspace */}
      {!loadingSubmission && !loadError && (
        <div className="space-y-3">
          {submission === null && !isInterviewer && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-400">
              No submission yet — use the sections below to add your solution.
            </p>
          )}
          {submission === null && isInterviewer && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-400">
              The candidate has not submitted anything yet.
            </p>
          )}

          {/* ── Candidate: edits GitHub + solution; views evaluation ── */}
          {/* ── Interviewer: views GitHub + solution; edits evaluation ── */}

          <GithubSection
            bookingId={bookingId}
            submission={submission}
            onUpdate={setSubmission}
            disabled={circuitOpen}
            readOnly={isInterviewer}
          />

          <FileSection
            bookingId={bookingId}
            submission={submission}
            type="solution"
            label="Solution File"
            onUpdate={setSubmission}
            disabled={circuitOpen}
            readOnly={isInterviewer}
          />

          <FileSection
            bookingId={bookingId}
            submission={submission}
            type="evaluation"
            label="Evaluation Report"
            onUpdate={setSubmission}
            disabled={circuitOpen}
            readOnly={!isInterviewer}  // candidate view-only, interviewer editable
          />
        </div>
      )}
    </div>
  );
}

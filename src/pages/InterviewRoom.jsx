import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';

// ─── Video element (muted for local to avoid echo) ────────────────────────────

function VideoEl({ stream, muted = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
}

// ─── Control button ───────────────────────────────────────────────────────────

function CtrlBtn({ onClick, active = true, danger = false, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'flex h-12 w-12 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
        danger
          ? 'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500'
          : active
            ? 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 focus:ring-slate-500',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ─── Status overlay ───────────────────────────────────────────────────────────

function StatusOverlay({ status }) {
  const labels = {
    connecting: 'Connecting…',
    waiting: 'Waiting for the other participant…',
    calling: 'Establishing connection…',
    connected: null,
    ended: 'Call ended',
    error: null,
  };

  const label = labels[status];
  if (!label) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 text-white">
      {status !== 'ended' && (
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-white" />
      )}
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function InterviewRoom({ profileType }) {
  const { id: bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const booking = location.state?.booking;

  // Guard: direct navigation without booking state
  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <p className="text-lg font-semibold">No session context found.</p>
        <p className="text-sm text-slate-400">Please join from the Bookings page.</p>
        <button
          type="button"
          onClick={() => navigate('/bookings')}
          className="mt-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
        >
          Go to Bookings
        </button>
      </div>
    );
  }

  const {
    localStream,
    remoteStream,
    connectionStatus,
    error,
    isMuted,
    isVideoOff,
    toggleAudio,
    toggleVideo,
    leaveCall,
  } = useWebRTC({
    bookingId,
    scheduledAt: booking.scheduledAt,
    durationMinutes: booking.durationMinutes,
    profileType,
  });

  function handleLeave() {
    leaveCall();
    navigate('/bookings');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">

      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">H</div>
          <span className="text-sm font-semibold text-slate-200">HireSphere</span>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-400">
            Interview Room <span className="font-mono">#{bookingId.slice(0, 8).toUpperCase()}</span>
          </span>
        </div>

        {connectionStatus === 'connected' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/40 px-2.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        )}
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div role="alert" className="border-b border-rose-800 bg-rose-950/60 px-5 py-2.5 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* ── Video area ── */}
      <div className="relative flex flex-1 items-center justify-center bg-slate-900">

        {/* Remote video (large) */}
        {remoteStream ? (
          <VideoEl
            stream={remoteStream}
            className="h-full max-h-[calc(100vh-180px)] w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-800 text-4xl text-slate-500">
              <svg fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24" className="h-14 w-14">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>
        )}

        {/* Status overlay */}
        <StatusOverlay status={connectionStatus} />

        {/* Local PiP (bottom-right) */}
        {localStream && (
          <div className="absolute bottom-4 right-4 overflow-hidden rounded-xl border-2 border-slate-700 shadow-lg">
            <VideoEl
              stream={localStream}
              muted
              className="h-28 w-44 object-cover sm:h-36 sm:w-56"
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 text-xs">
                Camera off
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <footer className="flex items-center justify-center gap-4 border-t border-slate-800 bg-slate-950 py-5">

        {/* Mute */}
        <CtrlBtn onClick={toggleAudio} active={!isMuted} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </CtrlBtn>

        {/* Camera */}
        <CtrlBtn onClick={toggleVideo} active={!isVideoOff} title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}>
          {isVideoOff ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )}
        </CtrlBtn>

        {/* Leave */}
        <CtrlBtn onClick={handleLeave} danger title="Leave call">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25M3 16.5v.75A2.25 2.25 0 005.25 19.5h13.5A2.25 2.25 0 0021 17.25v-.75m-18 0V9.75A2.25 2.25 0 015.25 7.5h.75m-3 9H3m18 0h-1.5m-15 0v.75A2.25 2.25 0 005.25 21h13.5" />
          </svg>
        </CtrlBtn>
      </footer>
    </div>
  );
}

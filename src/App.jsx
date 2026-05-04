import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { AuthGuard } from './components/AuthGuard';
import { AppShell } from './components/AppShell';
import { Availability } from './pages/Availability';
import { Bookings } from './pages/Bookings';
import { Dashboard } from './pages/Dashboard';
import { Discovery } from './pages/Discovery';
import { EditProfile } from './pages/EditProfile';
import { InterviewRoom } from './pages/InterviewRoom';
import { Onboarding } from './pages/Onboarding';
import { Inbox } from './components/messaging/Inbox';
import { ChatWindow } from './components/messaging/ChatWindow';

function App({ signOut, user }) {
  const [attributes,      setAttributes]      = useState({});
  const [attributesError, setAttributesError] = useState('');
  const loggedTokenForUser = useRef(null);

  useEffect(() => {
    if (!user?.userId || loggedTokenForUser.current === user.userId) return;
    loggedTokenForUser.current = user.userId;
    fetchAuthSession()
      .then(session => { if (session.tokens?.idToken) console.log(session.tokens.idToken.toString()); })
      .catch(err => console.error('Unable to load id token.', err));
  }, [user?.userId]);

  useEffect(() => {
    let isMounted = true;
    fetchUserAttributes()
      .then(attrs => { if (isMounted) { setAttributes(attrs); setAttributesError(''); } })
      .catch(() => { if (isMounted) setAttributesError('Unable to load user attributes.'); });
    return () => { isMounted = false; };
  }, [user?.userId]);

  const email = useMemo(
    () => attributes.email || user?.signInDetails?.loginId || user?.username || 'Unknown user',
    [attributes.email, user],
  );
  const profileType = attributes['custom:profile_type'] ?? null;
  const userId      = user?.userId;

  // Shell wraps all authenticated, non-fullscreen pages
  function Shell({ children }) {
    return (
      <AuthGuard profileType={profileType}>
        <AppShell email={email} profileType={profileType} signOut={signOut} userId={userId}>
          {children}
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <>
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed', inset: '0 0 auto 0', zIndex: 10000,
          backgroundColor: '#1a1a2e', borderBottom: '2px solid #e94560',
          padding: '4px 16px', textAlign: 'center', fontSize: '12px',
          color: '#e94560', fontWeight: 600, letterSpacing: '0.05em',
        }}>
          DEVELOPMENT — {import.meta.env.MODE} &nbsp;|&nbsp; {import.meta.env.VITE_API_BASE_URL ?? 'no API URL set'}
        </div>
      )}

      {attributesError && (
        <div style={{
          position: 'fixed', inset: '0 0 auto 0', zIndex: 9999,
          backgroundColor: '#FFF4CE', borderBottom: '1px solid #F7E28D',
          padding: '8px 16px', textAlign: 'center', fontSize: '14px', color: '#835B00',
        }}>
          {attributesError}
        </div>
      )}

      <Routes>
        <Route path="/dashboard" element={
          <Shell><Dashboard email={email} profileType={profileType} userId={userId} /></Shell>
        } />

        <Route path="/discovery" element={
          <Shell><Discovery email={email} profileType={profileType} /></Shell>
        } />

        <Route path="/availability" element={
          <Shell><Availability email={email} profileType={profileType} signOut={signOut} /></Shell>
        } />

        <Route path="/bookings" element={
          <Shell><Bookings email={email} profileType={profileType} /></Shell>
        } />

        <Route path="/messages" element={
          <Shell><Inbox userId={userId} /></Shell>
        } />

        <Route path="/messages/:targetUserId" element={
          <Shell><ChatWindow userId={userId} /></Shell>
        } />

        <Route path="/profile/edit" element={
          <Shell><EditProfile profileType={profileType} /></Shell>
        } />

        <Route path="/room/:id" element={
          <AuthGuard profileType={profileType}>
            <InterviewRoom profileType={profileType} />
          </AuthGuard>
        } />

        <Route path="/onboarding" element={<Onboarding profileType={profileType} />} />

        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Routes>
    </>
  );
}

export default App;

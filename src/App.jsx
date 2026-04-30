import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { AuthGuard } from './components/AuthGuard';
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
  const [attributes, setAttributes] = useState({});
  const [attributesError, setAttributesError] = useState('');
  const loggedTokenForUser = useRef(null);

  useEffect(() => {
    if (!user?.userId || loggedTokenForUser.current === user.userId) return;
    loggedTokenForUser.current = user.userId;

    fetchAuthSession()
      .then((session) => {
        if (session.tokens?.idToken) {
          console.log(session.tokens.idToken.toString());
        }
      })
      .catch((error) => console.error('Unable to load id token.', error));
  }, [user?.userId]);

  useEffect(() => {
    let isMounted = true;
    fetchUserAttributes()
      .then((attrs) => {
        if (isMounted) {
          setAttributes(attrs);
          setAttributesError('');
        }
      })
      .catch(() => {
        if (isMounted) setAttributesError('Unable to load user attributes.');
      });
    return () => {
      isMounted = false;
    };
  }, [user?.userId]);

  const email = useMemo(
    () => attributes.email || user?.signInDetails?.loginId || user?.username || 'Unknown user',
    [attributes.email, user],
  );

  // null while attributes are still loading — AuthGuard and Onboarding both
  // wait on this value before doing anything
  const profileType = attributes['custom:profile_type'] ?? null;

  return (
    <>
      {attributesError && (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          {attributesError}
        </div>
      )}

      <Routes>
        {/*
          AuthGuard checks the backend on every /dashboard mount.
          It redirects to /onboarding if the profile is absent or incomplete.
        */}
        <Route
          element={
            <AuthGuard profileType={profileType}>
              <Dashboard email={email} profileType={profileType} signOut={signOut} userId={user?.userId} />
            </AuthGuard>
          }
          path="/dashboard"
        />

        <Route
          element={
            <AuthGuard profileType={profileType}>
              <Discovery email={email} profileType={profileType} signOut={signOut} />
            </AuthGuard>
          }
          path="/discovery"
        />

        <Route
          element={
            <AuthGuard profileType={profileType}>
              <Availability email={email} profileType={profileType} signOut={signOut} />
            </AuthGuard>
          }
          path="/availability"
        />

        <Route
          element={
            <AuthGuard profileType={profileType}>
              <Bookings email={email} profileType={profileType} signOut={signOut} />
            </AuthGuard>
          }
          path="/bookings"
        />

        <Route
          element={
            <AuthGuard profileType={profileType}>
              <InterviewRoom profileType={profileType} />
            </AuthGuard>
          }
          path="/room/:id"
        />

        <Route
          element={
            <AuthGuard profileType={profileType}>
              <Inbox email={email} profileType={profileType} signOut={signOut} userId={user?.userId} />
            </AuthGuard>
          }
          path="/messages"
        />

        <Route
          element={
            <AuthGuard profileType={profileType}>
              <ChatWindow email={email} profileType={profileType} signOut={signOut} userId={user?.userId} />
            </AuthGuard>
          }
          path="/messages/:targetUserId"
        />

        <Route element={<Onboarding profileType={profileType} />} path="/onboarding" />

        <Route element={<EditProfile profileType={profileType} />} path="/profile/edit" />

        <Route element={<Navigate replace to="/dashboard" />} path="*" />
      </Routes>
    </>
  );
}

export default App;

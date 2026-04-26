import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { fetchUserAttributes } from 'aws-amplify/auth';

function Dashboard({ email, profileType }) {
  const stats = [
    { label: 'Simulations', value: '0', detail: 'Ready to schedule' },
    { label: 'Skill tracks', value: '4', detail: 'Frontend, backend, cloud, systems' },
    { label: 'Profile', value: profileType, detail: 'Used for role-based journeys' },
  ];

  return (
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

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            key={item.label}
          >
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
            <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function App({ signOut, user }) {
  const [attributes, setAttributes] = useState({});
  const [attributesError, setAttributesError] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetchUserAttributes()
      .then((userAttributes) => {
        if (isMounted) {
          setAttributes(userAttributes);
          setAttributesError('');
        }
      })
      .catch(() => {
        if (isMounted) {
          setAttributesError('Unable to load user attributes.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.userId]);

  const email = useMemo(
    () => attributes.email || user?.signInDetails?.loginId || user?.username || 'Unknown user',
    [attributes.email, user],
  );

  const profileType = attributes['custom:profile_type'] || 'Profile not set';

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-semibold text-white"
              to="/"
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

      {attributesError ? (
        <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {attributesError}
          </p>
        </div>
      ) : null}

      <Routes>
        <Route
          element={<Dashboard email={email} profileType={profileType} />}
          path="/"
        />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </div>
  );
}

export default App;

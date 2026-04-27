import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfile } from '../services/userService';
import { useOnboardingForm } from '../hooks/useOnboardingForm';
import { PROFILE_FIELDS } from '../constants/onboarding';
import { FormField } from '../components/FormField';

function EditForm({ profileType, initialValues }) {
  const { fields, values, submitting, error, handleChange, handleSubmit } =
    useOnboardingForm(profileType, initialValues);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            to="/dashboard"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Edit Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update your <span className="font-medium text-slate-700">{profileType}</span> details.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {fields.map((field) => (
              <FormField
                field={field}
                key={field.name}
                onChange={handleChange}
                value={values[field.name]}
              />
            ))}

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function EditProfile({ profileType }) {
  const [initialValues, setInitialValues] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!profileType) return;

    getProfile()
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        const subProfile =
          profileType === 'Candidate' ? data.candidateProfile : data.interviewerProfile;
        const fields = PROFILE_FIELDS[profileType] ?? [];
        setInitialValues(
          Object.fromEntries(fields.map((f) => [f.name, subProfile?.[f.name] ?? ''])),
        );
      })
      .catch(() => setLoadError('Failed to load profile. Please try again.'));
  }, [profileType]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {loadError}
        </div>
      </div>
    );
  }

  if (!profileType || !initialValues) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="animate-pulse text-sm text-slate-500">Loading profile…</p>
      </div>
    );
  }

  return <EditForm initialValues={initialValues} profileType={profileType} />;
}

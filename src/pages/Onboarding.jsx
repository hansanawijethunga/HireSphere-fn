import { useOnboardingForm } from '../hooks/useOnboardingForm';
import { FormField } from '../components/FormField';

export function Onboarding({ profileType }) {
  const { fields, values, submitting, error, handleChange, handleSubmit } =
    useOnboardingForm(profileType);

  if (!profileType) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="animate-pulse text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            H
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            Complete your profile
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tell us about yourself to get started as a{' '}
            <span className="font-medium text-slate-700">{profileType}</span>.
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
              {submitting ? 'Saving…' : 'Save & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

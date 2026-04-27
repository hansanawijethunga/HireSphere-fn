import { useProfileGuard } from '../hooks/useProfileGuard';

const STATUS_VIEWS = {
  loading: (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="animate-pulse text-sm text-slate-500">Loading your profile…</p>
    </div>
  ),
  error: (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Failed to load profile. Please refresh the page.
      </div>
    </div>
  ),
};

export function AuthGuard({ profileType, children }) {
  const status = useProfileGuard(profileType);
  return STATUS_VIEWS[status] ?? children;
}

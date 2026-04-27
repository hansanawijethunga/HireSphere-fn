import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, syncUser } from '../services/userService';
import { COMPLETION_CHECK } from '../constants/onboarding';

/**
 * Drives the AuthGuard state machine:
 *   'loading' → API in-flight (or profileType not yet known)
 *   'ready'   → profile exists and is complete; render children
 *   'error'   → unrecoverable API failure
 *
 * Side-effects: navigates to /onboarding when profile is absent or incomplete.
 */
export function useProfileGuard(profileType) {
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();

  useEffect(() => {
    // Wait until Cognito attributes have resolved
    if (!profileType) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await getProfile();

        if (response.status === 404) {
          await syncUser();
          if (!cancelled) navigate('/onboarding', { replace: true });
          return;
        }

        if (!response.ok) throw new Error(`Unexpected status: ${response.status}`);

        const data = await response.json();
        const isComplete = COMPLETION_CHECK[profileType]?.(data) ?? false;

        if (!cancelled) {
          if (isComplete) {
            setStatus('ready');
          } else {
            navigate('/onboarding', { replace: true });
          }
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileType, navigate]);

  return status;
}

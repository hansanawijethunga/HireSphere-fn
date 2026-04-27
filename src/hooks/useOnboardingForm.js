import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../services/userService';
import { PROFILE_FIELDS } from '../constants/onboarding';

export function useOnboardingForm(profileType, initialValues = null) {
  const fields = useMemo(() => PROFILE_FIELDS[profileType] ?? [], [profileType]);

  const [values, setValues] = useState({});

  // Re-initialise when fields resolve (onboarding) or initial values load (edit)
  useEffect(() => {
    setValues(Object.fromEntries(fields.map((f) => [f.name, initialValues?.[f.name] ?? ''])));
  }, [fields, initialValues]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleChange({ target: { name, value } }) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = Object.fromEntries(
      fields.map((f) => [f.name, f.type === 'number' ? parseInt(values[f.name], 10) : values[f.name]]),
    );
    const response = await updateProfile(payload);
      if (!response.ok) throw new Error('Profile update failed');
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return { fields, values, submitting, error, handleChange, handleSubmit };
}

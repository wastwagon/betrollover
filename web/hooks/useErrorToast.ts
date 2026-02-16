import { useState, useCallback } from 'react';

export function useErrorToast() {
  const [error, setError] = useState<unknown>(null);

  const showError = useCallback((err: unknown) => {
    setError(err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { showError, clearError, error };
}

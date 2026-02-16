'use client';

import { useState, useCallback } from 'react';

export function useToast() {
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showError = useCallback((err: unknown) => {
    setSuccess(null);
    setError(err);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setError(null);
    setSuccess(msg);
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);

  return { showError, showSuccess, clearError, clearSuccess, error, success };
}

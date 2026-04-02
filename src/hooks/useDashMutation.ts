import { useState, useCallback } from 'react';
import { useSDK } from '../DashProvider';
import type { EvoSDK } from '@dashevo/evo-sdk';

interface MutationState<T> {
  execute: () => Promise<T | undefined>;
  isSubmitting: boolean;
  error: string | null;
  reset: () => void;
}

export function useDashMutation<T>(
  mutationFn: (sdk: EvoSDK) => Promise<T>,
): MutationState<T> {
  const sdk = useSDK();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const result = await mutationFn(sdk);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [sdk, mutationFn]);

  return {
    execute,
    isSubmitting,
    error,
    reset: () => setError(null),
  };
}

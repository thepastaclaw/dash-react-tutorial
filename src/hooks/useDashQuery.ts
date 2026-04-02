import { useEffect, useState } from 'react';
import { useDash } from '../DashProvider';
import type { EvoSDK } from '@dashevo/evo-sdk';

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashQuery<T>(
  queryFn: (sdk: EvoSDK) => Promise<T>,
  deps: unknown[] = [],
): QueryState<T> {
  const { sdk } = useDash();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (!sdk) return;

    let cancelled = false;
    setIsLoading(true);

    queryFn(sdk)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [sdk, trigger, ...deps]);

  return {
    data,
    isLoading,
    error,
    refetch: () => setTrigger((n) => n + 1),
  };
}

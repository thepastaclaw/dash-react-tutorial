import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { EvoSDK } from '@dashevo/evo-sdk';

interface DashContextValue {
  sdk: EvoSDK | null;
  isConnecting: boolean;
  error: string | null;
}

const DashContext = createContext<DashContextValue>({
  sdk: null,
  isConnecting: true,
  error: null,
});

export function useDash() {
  return useContext(DashContext);
}

export function useSDK(): EvoSDK {
  const { sdk } = useDash();
  if (!sdk) throw new Error('SDK not connected. Wrap your app in <DashProvider>.');
  return sdk;
}

interface DashProviderProps {
  network?: 'testnet' | 'mainnet' | 'local';
  children: ReactNode;
}

export function DashProvider({ network = 'testnet', children }: DashProviderProps) {
  const [sdk, setSdk] = useState<EvoSDK | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        setIsConnecting(true);
        setError(null);

        const instance = new EvoSDK({ network, trusted: true });
        await instance.connect();

        if (!cancelled) {
          setSdk(instance);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
        }
      } finally {
        if (!cancelled) {
          setIsConnecting(false);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
    };
  }, [network]);

  return (
    <DashContext.Provider value={{ sdk, isConnecting, error }}>
      {children}
    </DashContext.Provider>
  );
}

import { useDash } from '../DashProvider';

export function ConnectionStatus() {
  const { sdk, isConnecting, error } = useDash();

  if (isConnecting) return <span className="status connecting">Connecting...</span>;
  if (error) return <span className="status error">Error: {error}</span>;
  if (sdk) return <span className="status connected">Connected to testnet</span>;
  return null;
}

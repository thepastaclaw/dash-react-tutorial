import { useState } from 'react';
import { useIdentity } from '../hooks/useIdentity';

export function IdentityViewer() {
  const [identityId, setIdentityId] = useState('');
  const [searchId, setSearchId] = useState('');
  const { data: identity, isLoading, error } = useIdentity(searchId);

  return (
    <div>
      <h2>Fetch Identity</h2>
      <form onSubmit={(e) => { e.preventDefault(); setSearchId(identityId); }}>
        <input
          value={identityId}
          onChange={(e) => setIdentityId(e.target.value)}
          placeholder="Enter identity ID"
        />
        <button type="submit">Fetch</button>
      </form>

      {isLoading && searchId && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {identity && (
        <div className="identity-card">
          <p><strong>ID:</strong> {identity.getId().toString()}</p>
          <p><strong>Balance:</strong> {identity.getBalance().toString()} credits</p>
          <p><strong>Public keys:</strong> {identity.getPublicKeys().length}</p>
        </div>
      )}
    </div>
  );
}

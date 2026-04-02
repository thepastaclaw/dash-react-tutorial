import { useState, useCallback } from 'react';
import { useDashMutation } from '../hooks/useDashMutation';

const CONTRACT_ID = 'YOUR_CONTRACT_ID';
const IDENTITY_ID = 'YOUR_IDENTITY_ID';
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY_WIF';

export function CreateListing() {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2024);
  const [price, setPrice] = useState(0);

  const mutation = useDashMutation(
    useCallback(
      (sdk) =>
        sdk.documents.create({
          contractId: CONTRACT_ID,
          documentType: 'listing',
          document: {
            make,
            model,
            year,
            priceUsd: price,
            mileageKm: 0,
            status: 'available',
          },
          identityId: IDENTITY_ID,
          privateKeyWif: PRIVATE_KEY,
          signingKeyIndex: 0,
          nonce: sdk.identities.contractNonce(IDENTITY_ID, CONTRACT_ID),
        }),
      [make, model, year, price],
    ),
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await mutation.execute();
      }}
    >
      <h2>Create Listing</h2>
      <input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} />
      <input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
      <input type="number" placeholder="Year" value={year} onChange={(e) => setYear(+e.target.value)} />
      <input type="number" placeholder="Price (USD)" value={price} onChange={(e) => setPrice(+e.target.value)} />
      <button type="submit" disabled={mutation.isSubmitting}>
        {mutation.isSubmitting ? 'Submitting...' : 'Create Listing'}
      </button>
      {mutation.error && <p className="error">{mutation.error}</p>}
    </form>
  );
}

import { useState, useCallback } from 'react';
import { useDashMutation } from '../hooks/useDashMutation';
import { Document, IdentitySigner } from '@dashevo/evo-sdk';

const CONTRACT_ID = 'YOUR_CONTRACT_ID';
const IDENTITY_ID = 'YOUR_IDENTITY_ID';
const PRIVATE_KEY_WIF = 'YOUR_PRIVATE_KEY_WIF';
const SIGNING_KEY_INDEX = 0;

export function CreateListing() {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2024);
  const [price, setPrice] = useState(0);

  const mutation = useDashMutation(
    useCallback(
      async (sdk) => {
        // Fetch the owner identity to get the signing key
        const identity = await sdk.identities.fetch(IDENTITY_ID);
        if (!identity) throw new Error('Identity not found');

        const identityKey = identity.publicKeys[SIGNING_KEY_INDEX];
        if (!identityKey) throw new Error('Signing key not found');

        // Create a signer with the private key
        const signer = new IdentitySigner();
        signer.addKeyFromWif(PRIVATE_KEY_WIF);

        // Build the document
        const document = new Document({
          documentTypeName: 'listing',
          dataContractId: CONTRACT_ID,
          ownerId: IDENTITY_ID,
          properties: {
            make,
            model,
            year,
            priceUsd: price,
            mileageKm: 0,
            status: 'available',
          },
        });

        // Broadcast the create transition
        await sdk.documents.create({
          document,
          identityKey,
          signer,
        });
      },
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

/**
 * Tutorial: Car Sales Management
 *
 * Corrected to match the actual @dashevo/evo-sdk@3.1.0-dev.1 API.
 * Original: https://dashpay.github.io/platform/evo-sdk/tutorials/car-sales.html
 */

import {
  EvoSDK,
  DataContract,
  Document,
  Identifier,
  IdentitySigner,
} from '@dashevo/evo-sdk';

// ──────────────────────────────────────────────
// Step 1: Design the data contract (unchanged)
// ──────────────────────────────────────────────

const carSalesSchema = {
  listing: {
    type: 'object',
    properties: {
      make:        { type: 'string', maxLength: 64 },
      model:       { type: 'string', maxLength: 64 },
      year:        { type: 'integer', minimum: 1900, maximum: 2100 },
      mileageKm:   { type: 'integer', minimum: 0 },
      priceUsd:    { type: 'integer', minimum: 0 },
      description: { type: 'string', maxLength: 1024 },
      imageUrl:    { type: 'string', maxLength: 512, format: 'uri' },
      status:      { type: 'string', enum: ['available', 'pending', 'sold'] },
    },
    required: ['make', 'model', 'year', 'priceUsd', 'status'],
    additionalProperties: false,
  },
  review: {
    type: 'object',
    properties: {
      sellerId:  { type: 'string', maxLength: 44 },
      listingId: { type: 'string', maxLength: 44 },
      rating:    { type: 'integer', minimum: 1, maximum: 5 },
      comment:   { type: 'string', maxLength: 512 },
    },
    required: ['sellerId', 'rating'],
    additionalProperties: false,
  },
};

// ──────────────────────────────────────────────
// Step 2: Connect and publish the contract
// ──────────────────────────────────────────────

const sdk = EvoSDK.testnetTrusted();
await sdk.connect();

// Your identity credentials
const identityId = 'YOUR_IDENTITY_ID';
const privateKeyWif = 'YOUR_PRIVATE_KEY_WIF';
const signingKeyIndex = 0;

// Fetch identity to get the signing key
const identity = await sdk.identities.fetch(identityId);
if (!identity) throw new Error('Identity not found');

const identityKey = identity.publicKeys[signingKeyIndex];

// Create a signer with your private key
const signer = new IdentitySigner();
signer.addKeyFromWif(privateKeyWif);

// Get the identity nonce for contract ID generation
const identityNonce = await sdk.identities.nonce(identityId);
if (identityNonce === undefined) throw new Error('Could not fetch nonce');

// Construct the DataContract object
const dataContract = new DataContract({
  ownerId: identityId,
  identityNonce,
  schemas: carSalesSchema,
});

// Publish the data contract
const contract = await sdk.contracts.publish({
  dataContract,
  identityKey,
  signer,
});

const contractId = contract.id.toString();
console.log('Contract published:', contractId);

// ──────────────────────────────────────────────
// Step 3: Create a listing
// ──────────────────────────────────────────────

const listingDoc = new Document({
  documentTypeName: 'listing',
  dataContractId: contractId,
  ownerId: identityId,
  properties: {
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    mileageKm: 45000,
    priceUsd: 22500,
    description: 'Well-maintained, single owner, full service history.',
    status: 'available',
  },
});

await sdk.documents.create({
  document: listingDoc,
  identityKey,
  signer,
});

console.log('Listing created!');

// ──────────────────────────────────────────────
// Step 4: Query listings
// ──────────────────────────────────────────────

// Fetch all available listings
const results = await sdk.documents.query({
  dataContractId: contractId,
  documentTypeName: 'listing',
  where: [['status', '==', 'available']],
  orderBy: [['priceUsd', 'asc']],
  limit: 20,
});

for (const [id, doc] of results) {
  if (!doc) continue;
  const data = doc.properties as Record<string, unknown>;
  console.log(`${data.year} ${data.make} ${data.model} — $${data.priceUsd}`);
  console.log(`  ID: ${id}`);
}

// Search by make
const toyotas = await sdk.documents.query({
  dataContractId: contractId,
  documentTypeName: 'listing',
  where: [
    ['make', '==', 'Toyota'],
    ['status', '==', 'available'],
  ],
  limit: 10,
});

// ──────────────────────────────────────────────
// Step 5: Update a listing (mark as sold)
// ──────────────────────────────────────────────

const listingId = 'THE_LISTING_DOCUMENT_ID';

// Fetch the existing document first
const existingDoc = await sdk.documents.get(contractId, 'listing', listingId);
if (!existingDoc) throw new Error('Listing not found');

// Update the properties
existingDoc.properties = {
  ...existingDoc.properties,
  status: 'sold',
};

// Increment the revision
existingDoc.revision = (existingDoc.revision ?? 0n) + 1n;

await sdk.documents.replace({
  document: existingDoc,
  identityKey,
  signer,
});

console.log('Listing marked as sold');

// ──────────────────────────────────────────────
// Step 6: Leave a review
// ──────────────────────────────────────────────

// Buyer's credentials
const buyerIdentityId = 'BUYER_IDENTITY_ID';
const buyerKeyWif = 'BUYER_PRIVATE_KEY_WIF';

const buyerIdentity = await sdk.identities.fetch(buyerIdentityId);
if (!buyerIdentity) throw new Error('Buyer identity not found');

const buyerKey = buyerIdentity.publicKeys[0];
const buyerSigner = new IdentitySigner();
buyerSigner.addKeyFromWif(buyerKeyWif);

const reviewDoc = new Document({
  documentTypeName: 'review',
  dataContractId: contractId,
  ownerId: buyerIdentityId,
  properties: {
    sellerId: 'SELLER_IDENTITY_ID',
    listingId: 'THE_LISTING_DOCUMENT_ID',
    rating: 5,
    comment: 'Great seller, car was exactly as described!',
  },
});

await sdk.documents.create({
  document: reviewDoc,
  identityKey: buyerKey,
  signer: buyerSigner,
});

// Query reviews for a seller
const reviews = await sdk.documents.query({
  dataContractId: contractId,
  documentTypeName: 'review',
  where: [['sellerId', '==', 'SELLER_IDENTITY_ID']],
  orderBy: [['rating', 'desc']],
  limit: 50,
});

let totalRating = 0;
let count = 0;
for (const [, doc] of reviews) {
  if (!doc) continue;
  const data = doc.properties as Record<string, unknown>;
  totalRating += data.rating as number;
  count++;
}
console.log(`Average rating: ${(totalRating / count).toFixed(1)} (${count} reviews)`);

/**
 * Tutorial: Car Sales Management
 *
 * Original code from: https://dashpay.github.io/platform/evo-sdk/tutorials/car-sales.html
 * NOTE: This code does NOT compile against @dashevo/evo-sdk@3.1.0-dev.1
 */

// @ts-nocheck — original tutorial code, kept verbatim for diffing

import { EvoSDK, wallet } from '@dashevo/evo-sdk';

// ──────────────────────────────────────────────
// Step 1: Design the data contract
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

// Publish the data contract
const contract = await sdk.contracts.publish({
  identityId,
  documentSchemas: carSalesSchema,
  privateKeyWif,
  signingKeyIndex,
  nonce: await sdk.identities.nonce(identityId),
});

const contractId = contract.getId().toString();
console.log('Contract published:', contractId);

// ──────────────────────────────────────────────
// Step 3: Create a listing
// ──────────────────────────────────────────────

const nonce = await sdk.identities.contractNonce(identityId, contractId);

await sdk.documents.create({
  contractId,
  documentType: 'listing',
  document: {
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    mileageKm: 45000,
    priceUsd: 22500,
    description: 'Well-maintained, single owner, full service history.',
    status: 'available',
  },
  identityId,
  privateKeyWif,
  signingKeyIndex,
  nonce,
});

console.log('Listing created!');

// ──────────────────────────────────────────────
// Step 4: Query listings
// ──────────────────────────────────────────────

// Fetch all available listings
const results = await sdk.documents.query({
  contractId,
  documentType: 'listing',
  where: [['status', '==', 'available']],
  orderBy: [['priceUsd', 'asc']],
  limit: 20,
});

for (const [id, doc] of results) {
  if (!doc) continue;
  const data = doc.getData();
  console.log(`${data.year} ${data.make} ${data.model} — $${data.priceUsd}`);
  console.log(`  ID: ${id}`);
}

// Search by make
const toyotas = await sdk.documents.query({
  contractId,
  documentType: 'listing',
  where: [
    ['make', '==', 'Toyota'],
    ['status', '==', 'available'],
  ],
  limit: 10,
});

// ──────────────────────────────────────────────
// Step 5: Update a listing
// ──────────────────────────────────────────────

const listingId = 'THE_LISTING_DOCUMENT_ID';

await sdk.documents.replace({
  contractId,
  documentType: 'listing',
  documentId: listingId,
  document: {
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    mileageKm: 45000,
    priceUsd: 22500,
    description: 'Well-maintained, single owner, full service history.',
    status: 'sold',
  },
  identityId,
  privateKeyWif,
  signingKeyIndex,
  nonce: await sdk.identities.contractNonce(identityId, contractId),
});

console.log('Listing marked as sold');

// ──────────────────────────────────────────────
// Step 6: Leave a review
// ──────────────────────────────────────────────

const buyerIdentityId = 'BUYER_IDENTITY_ID';
const buyerKeyWif = 'BUYER_PRIVATE_KEY_WIF';

await sdk.documents.create({
  contractId,
  documentType: 'review',
  document: {
    sellerId: 'SELLER_IDENTITY_ID',
    listingId: 'THE_LISTING_DOCUMENT_ID',
    rating: 5,
    comment: 'Great seller, car was exactly as described!',
  },
  identityId: buyerIdentityId,
  privateKeyWif: buyerKeyWif,
  signingKeyIndex: 0,
  nonce: await sdk.identities.contractNonce(buyerIdentityId, contractId),
});

// Query reviews for a seller
const reviews = await sdk.documents.query({
  contractId,
  documentType: 'review',
  where: [['sellerId', '==', 'SELLER_IDENTITY_ID']],
  orderBy: [['rating', 'desc']],
  limit: 50,
});

let totalRating = 0;
let count = 0;
for (const [, doc] of reviews) {
  if (!doc) continue;
  totalRating += doc.getData().rating;
  count++;
}
console.log(`Average rating: ${(totalRating / count).toFixed(1)} (${count} reviews)`);

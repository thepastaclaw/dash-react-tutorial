/**
 * Test runner for the corrected Car Sales tutorial.
 * Uses a real testnet identity to verify all operations work.
 */

import {
  EvoSDK,
  DataContract,
  Document,
  Identifier,
  IdentitySigner,
} from '@dashevo/evo-sdk';

const IDENTITY_ID = 'HHjmkbcwqFzToaoyvQcP45JZro7PoczAv7Nii57uYPX1';
const HIGH_AUTH_KEY_WIF = 'cT1DF1icxCLhksMDMEXikv1XpJjc7GfQTmq145HE5p9VbECAzN7Y';
const HIGH_AUTH_KEY_INDEX = 1;

console.log('=== Car Sales Tutorial Test ===\n');

// Step 1: Connect
console.log('Step 1: Connecting to testnet...');
const sdk = EvoSDK.testnetTrusted();
await sdk.connect();
console.log('Connected!\n');

// Fetch identity
console.log('Fetching identity...');
const identity = await sdk.identities.fetch(IDENTITY_ID);
if (!identity) throw new Error('Identity not found');
console.log(`Identity: ${identity.id.toString()}`);
console.log(`Balance: ${identity.balance.toString()} credits`);

const identityKey = identity.publicKeys[HIGH_AUTH_KEY_INDEX];
const signer = new IdentitySigner();
signer.addKeyFromWif(HIGH_AUTH_KEY_WIF);

// Step 2: Publish the data contract
// NOTE: Properties need `position` fields for DPP, and indexed queries need
// an `indices` array. The original tutorial omits both.
console.log('\nStep 2: Publishing data contract...');

const carSalesSchema = {
  listing: {
    type: 'object',
    properties: {
      make:        { type: 'string', maxLength: 64, position: 0 },
      model:       { type: 'string', maxLength: 64, position: 1 },
      year:        { type: 'integer', minimum: 1900, maximum: 2100, position: 2 },
      mileageKm:   { type: 'integer', minimum: 0, position: 3 },
      priceUsd:    { type: 'integer', minimum: 0, position: 4 },
      description: { type: 'string', maxLength: 1024, position: 5 },
      status:      { type: 'string', enum: ['available', 'pending', 'sold'], position: 6 },
    },
    indices: [
      { name: 'byStatus', properties: [{ status: 'asc' }] },
      { name: 'byStatusPrice', properties: [{ status: 'asc' }, { priceUsd: 'asc' }] },
      { name: 'byMakeStatus', properties: [{ make: 'asc' }, { status: 'asc' }] },
    ],
    required: ['make', 'model', 'year', 'priceUsd', 'status'],
    additionalProperties: false,
  },
  review: {
    type: 'object',
    properties: {
      sellerId:  { type: 'string', maxLength: 44, position: 0 },
      listingId: { type: 'string', maxLength: 44, position: 1 },
      rating:    { type: 'integer', minimum: 1, maximum: 5, position: 2 },
      comment:   { type: 'string', maxLength: 512, position: 3 },
    },
    indices: [
      { name: 'bySellerRating', properties: [{ sellerId: 'asc' }, { rating: 'desc' }] },
    ],
    required: ['sellerId', 'rating'],
    additionalProperties: false,
  },
};

const identityNonce = await sdk.identities.nonce(IDENTITY_ID);
console.log(`Identity nonce: ${identityNonce}`);

const dataContract = new DataContract({
  ownerId: IDENTITY_ID,
  identityNonce: identityNonce + 1n,
  schemas: carSalesSchema,
});

const contract = await sdk.contracts.publish({
  dataContract,
  identityKey,
  signer,
});

const contractId = contract.id.toString();
console.log(`Contract published: ${contractId}\n`);

// Step 3: Create a listing
console.log('Step 3: Creating a listing...');

const listingDoc = new Document({
  documentTypeName: 'listing',
  dataContractId: contractId,
  ownerId: IDENTITY_ID,
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

console.log('Listing created!\n');

// Step 4: Query listings
console.log('Step 4: Querying listings...');

const results = await sdk.documents.query({
  dataContractId: contractId,
  documentTypeName: 'listing',
  where: [['status', '==', 'available']],
  orderBy: [['priceUsd', 'asc']],
  limit: 20,
});

let listingDocId = null;
for (const [id, doc] of results) {
  if (!doc) continue;
  const data = doc.properties;
  console.log(`${data.year} ${data.make} ${data.model} — $${data.priceUsd}`);
  console.log(`  ID: ${id}`);
  listingDocId = id;
}

console.log(`Found ${results.size} listing(s)\n`);

// Step 5: Update the listing (mark as sold)
if (listingDocId) {
  console.log('Step 5: Updating listing to sold...');

  const existingDoc = await sdk.documents.get(contractId, 'listing', listingDocId);
  if (!existingDoc) throw new Error('Listing not found');

  existingDoc.properties = {
    ...existingDoc.properties,
    status: 'sold',
  };
  existingDoc.revision = (existingDoc.revision ?? 0n) + 1n;

  await sdk.documents.replace({
    document: existingDoc,
    identityKey,
    signer,
  });

  console.log('Listing marked as sold!');

  // Verify
  const soldResults = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: 'listing',
    where: [['status', '==', 'sold']],
    limit: 5,
  });

  for (const [, doc] of soldResults) {
    if (!doc) continue;
    const data = doc.properties;
    console.log(`Verified: ${data.make} ${data.model} — status: ${data.status}\n`);
  }
}

// Step 6: Create a review
console.log('Step 6: Creating a review...');

const reviewDoc = new Document({
  documentTypeName: 'review',
  dataContractId: contractId,
  ownerId: IDENTITY_ID,
  properties: {
    sellerId: IDENTITY_ID,
    rating: 5,
    comment: 'Great seller, car was exactly as described!',
  },
});

await sdk.documents.create({
  document: reviewDoc,
  identityKey,
  signer,
});

console.log('Review created!');

// Query reviews
const reviews = await sdk.documents.query({
  dataContractId: contractId,
  documentTypeName: 'review',
  where: [['sellerId', '==', IDENTITY_ID]],
  orderBy: [['rating', 'desc']],
  limit: 50,
});

let totalRating = 0;
let count = 0;
for (const [, doc] of reviews) {
  if (!doc) continue;
  const data = doc.properties;
  totalRating += Number(data.rating);
  count++;
}
console.log(`Average rating: ${(totalRating / count).toFixed(1)} (${count} reviews)`);

console.log('\n=== Car Sales Tutorial: ALL STEPS PASSED ===');
process.exit(0);

import { EvoSDK } from '@dashevo/evo-sdk';

const sdk = EvoSDK.testnetTrusted();
await sdk.connect();

const identityId = 'HHjmkbcwqFzToaoyvQcP45JZro7PoczAv7Nii57uYPX1';
console.log('Fetching identity:', identityId);

const identity = await sdk.identities.fetch(identityId);
if (!identity) {
  console.error('Identity not found!');
  process.exit(1);
}

console.log('ID:', identity.id.toString());
console.log('Balance:', identity.balance.toString(), 'credits');
console.log('Revision:', identity.revision.toString());
console.log('Public keys:', identity.publicKeys.length);

for (const key of identity.publicKeys) {
  console.log(`  Key ${key.id}: purpose=${key.purpose}, securityLevel=${key.securityLevel}`);
}

process.exit(0);

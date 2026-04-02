/**
 * Tutorial: Creating a Basic Token
 *
 * Original code from: https://dashpay.github.io/platform/evo-sdk/tutorials/basic-token.html
 * NOTE: This code does NOT compile against @dashevo/evo-sdk@3.1.0-dev.1
 */

// @ts-nocheck — original tutorial code, kept verbatim for diffing

import { EvoSDK, wallet } from '@dashevo/evo-sdk';

// ──────────────────────────────────────────────
// Step 1: Define the token contract
// ──────────────────────────────────────────────

const sdk = EvoSDK.testnetTrusted();
await sdk.connect();

const identityId = 'YOUR_IDENTITY_ID';
const privateKeyWif = 'YOUR_PRIVATE_KEY_WIF';
const signingKeyIndex = 0;

// Define a contract with a token
const contractSchema = {
  // Document types (optional — a token-only contract can have none)
  tokenMetadata: {
    type: 'object',
    properties: {
      tokenName: { type: 'string', maxLength: 64 },
      description: { type: 'string', maxLength: 256 },
    },
    additionalProperties: false,
  },
};

// Token configuration is passed separately when publishing
const tokenConfig = {
  // Position 0 = first token in this contract
  conventions: {
    localizations: {
      en: {
        shouldCapitalize: true,
        singularForm: 'CoffeeCoin',
        pluralForm: 'CoffeeCoins',
      },
    },
    decimals: 2,
  },
  // The contract owner can mint manually
  manualMinting: {
    rules: {
      // Allow the contract owner to mint
      type: 'ownerOnly',
    },
  },
  // The contract owner can burn their own tokens
  manualBurning: {
    rules: {
      type: 'ownerOnly',
    },
  },
  // Maximum supply (optional)
  maxSupply: 1_000_000_00, // 1,000,000.00 with 2 decimals
};

// ──────────────────────────────────────────────
// Step 2: Publish the contract
// ──────────────────────────────────────────────

const contract = await sdk.contracts.publish({
  identityId,
  documentSchemas: contractSchema,
  tokens: [tokenConfig],
  privateKeyWif,
  signingKeyIndex,
  nonce: await sdk.identities.nonce(identityId),
});

const contractId = contract.getId().toString();
console.log('Contract published:', contractId);

// Calculate the token ID (derived from contract ID + position)
const tokenId = await sdk.tokens.calculateId(contractId, 0);
console.log('Token ID:', tokenId);

// ──────────────────────────────────────────────
// Step 3: Mint tokens
// ──────────────────────────────────────────────

// Mint 10,000.00 CoffeeCoins to yourself
await sdk.tokens.mint({
  tokenId,
  amount: 10_000_00,          // 10,000.00 (2 decimal places)
  recipientId: identityId,    // mint to yourself
  identityId,
  privateKeyWif,
  signingKeyIndex,
  nonce: await sdk.identities.nonce(identityId),
});

console.log('Minted 10,000 CoffeeCoins');

// Mint to another identity
await sdk.tokens.mint({
  tokenId,
  amount: 500_00,             // 500.00 CoffeeCoins
  recipientId: 'RECIPIENT_IDENTITY_ID',
  identityId,
  privateKeyWif,
  signingKeyIndex,
  nonce: await sdk.identities.nonce(identityId),
});

// ──────────────────────────────────────────────
// Step 4: Check balances
// ──────────────────────────────────────────────

// Check your own balance
const myBalances = await sdk.tokens.identityBalances(identityId, [tokenId]);
const myBalance = myBalances.get(tokenId) ?? 0n;
console.log('My balance:', Number(myBalance) / 100, 'CoffeeCoins');

// Check multiple identities at once
const balances = await sdk.tokens.balances(
  [identityId, 'OTHER_IDENTITY_ID'],
  tokenId,
);

for (const [id, balance] of balances) {
  console.log(`${id}: ${Number(balance) / 100} CoffeeCoins`);
}

// Check total supply
const supply = await sdk.tokens.totalSupply(tokenId);
if (supply) {
  console.log('Total supply:', Number(supply.totalSupply) / 100, 'CoffeeCoins');
}

// ──────────────────────────────────────────────
// Step 5: Transfer tokens
// ──────────────────────────────────────────────

await sdk.tokens.transfer({
  tokenId,
  amount: 25_00,              // 25.00 CoffeeCoins
  recipientId: 'RECIPIENT_IDENTITY_ID',
  identityId,
  privateKeyWif,
  signingKeyIndex,
  nonce: await sdk.identities.nonce(identityId),
});

console.log('Transferred 25 CoffeeCoins');

// ──────────────────────────────────────────────
// Step 6: Burn tokens
// ──────────────────────────────────────────────

await sdk.tokens.burn({
  tokenId,
  amount: 100_00,             // 100.00 CoffeeCoins
  identityId,
  privateKeyWif,
  signingKeyIndex,
  nonce: await sdk.identities.nonce(identityId),
});

console.log('Burned 100 CoffeeCoins');

// ──────────────────────────────────────────────
// Full example
// ──────────────────────────────────────────────

async function main() {
  const sdk = EvoSDK.testnetTrusted();
  await sdk.connect();

  const identityId = 'YOUR_IDENTITY_ID';
  const privateKeyWif = 'YOUR_PRIVATE_KEY_WIF';
  const tokenId = 'YOUR_TOKEN_ID';  // from step 2

  // Check balance
  const balances = await sdk.tokens.identityBalances(identityId, [tokenId]);
  console.log('Balance:', balances.get(tokenId) ?? 0n);

  // Transfer
  await sdk.tokens.transfer({
    tokenId,
    amount: 10_00,
    recipientId: 'FRIEND_IDENTITY_ID',
    identityId,
    privateKeyWif,
    signingKeyIndex: 0,
    nonce: await sdk.identities.nonce(identityId),
  });

  console.log('Transfer complete!');
}

main().catch(console.error);

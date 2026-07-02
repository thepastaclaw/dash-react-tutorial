/**
 * Tutorial: Creating a Basic Token
 *
 * Corrected to match the actual @dashevo/evo-sdk@3.1.0-dev.1 API.
 * Original: https://dashpay.github.io/platform/evo-sdk/tutorials/basic-token.html
 */

import {
  EvoSDK,
  DataContract,
  IdentitySigner,
  TokenConfigurationConvention,
  TokenConfigurationLocalization,
  TokenConfiguration,
  ChangeControlRules,
  AuthorizedActionTakers,
  TokenDistributionRules,
  TokenKeepsHistoryRules,
  TokenMarketplaceRules,
  TokenTradeMode,
  Identifier,
} from '@dashevo/evo-sdk';

// ──────────────────────────────────────────────
// Step 1: Define the token contract
// ──────────────────────────────────────────────

const sdk = EvoSDK.testnetTrusted();
await sdk.connect();

const identityId = 'YOUR_IDENTITY_ID';
const privateKeyWif = 'YOUR_PRIVATE_KEY_WIF';
const signingKeyIndex = 0;

// Fetch identity and set up signer
const identity = await sdk.identities.fetch(identityId);
if (!identity) throw new Error('Identity not found');

const identityKey = identity.publicKeys[signingKeyIndex];
const signer = new IdentitySigner();
signer.addKeyFromWif(privateKeyWif);

// Document schema (optional for a token-only contract)
const contractSchema = {
  tokenMetadata: {
    type: 'object',
    properties: {
      tokenName: { type: 'string', maxLength: 64 },
      description: { type: 'string', maxLength: 256 },
    },
    additionalProperties: false,
  },
};

// Build the token configuration using SDK classes
const localization = new TokenConfigurationLocalization(
  true,           // shouldCapitalize
  'CoffeeCoin',   // singularForm
  'CoffeeCoins',  // pluralForm
);

const conventions = new TokenConfigurationConvention(
  { en: localization },
  2,  // decimals
);

// Helper: rules that allow only the contract owner
const ownerOnly = new ChangeControlRules({
  authorizedToMakeChange: AuthorizedActionTakers.ContractOwner(),
  adminActionTakers: AuthorizedActionTakers.ContractOwner(),
});

// Helper: rules that allow no one (immutable)
const noOne = new ChangeControlRules({
  authorizedToMakeChange: AuthorizedActionTakers.NoOne(),
  adminActionTakers: AuthorizedActionTakers.NoOne(),
});

const tokenConfig = new TokenConfiguration({
  conventions,
  conventionsChangeRules: noOne,
  baseSupply: 0n,
  maxSupply: 1_000_000_00n,  // 1,000,000.00 with 2 decimals
  maxSupplyChangeRules: noOne,
  keepsHistory: new TokenKeepsHistoryRules({
    isKeepingMintingHistory: true,
    isKeepingBurningHistory: true,
    isKeepingTransferHistory: true,
  }),
  distributionRules: new TokenDistributionRules({
    perpetualDistributionRules: noOne,
    newTokensDestinationIdentityRules: noOne,
    mintingAllowChoosingDestination: true,
    mintingAllowChoosingDestinationRules: noOne,
    changeDirectPurchasePricingRules: noOne,
  }),
  marketplaceRules: new TokenMarketplaceRules(
    TokenTradeMode.NotTradeable(),
    noOne,
  ),
  manualMintingRules: ownerOnly,
  manualBurningRules: ownerOnly,
  freezeRules: noOne,
  unfreezeRules: noOne,
  destroyFrozenFundsRules: noOne,
  emergencyActionRules: noOne,
  mainControlGroupCanBeModified: AuthorizedActionTakers.NoOne(),
});

// ──────────────────────────────────────────────
// Step 2: Publish the contract
// ──────────────────────────────────────────────

const identityNonce = await sdk.identities.nonce(identityId);
if (identityNonce === undefined) throw new Error('Could not fetch nonce');

const dataContract = new DataContract({
  ownerId: identityId,
  identityNonce,
  schemas: contractSchema,
  tokens: { 0: tokenConfig },
});

const contract = await sdk.contracts.publish({
  dataContract,
  identityKey,
  signer,
});

const contractId = contract.id.toString();
console.log('Contract published:', contractId);

// Calculate the token ID (derived from contract ID + position)
const tokenId = await sdk.tokens.calculateId(contractId, 0);
console.log('Token ID:', tokenId);

// ──────────────────────────────────────────────
// Step 3: Mint tokens
// ──────────────────────────────────────────────

// Mint 10,000.00 CoffeeCoins to yourself
await sdk.tokens.mint({
  dataContractId: new Identifier(contractId),
  tokenPosition: 0,
  amount: 10_000_00n,          // 10,000.00 (2 decimal places), bigint
  recipientId: new Identifier(identityId),
  identityId: new Identifier(identityId),
  identityKey,
  signer,
});

console.log('Minted 10,000 CoffeeCoins');

// Mint to another identity
await sdk.tokens.mint({
  dataContractId: new Identifier(contractId),
  tokenPosition: 0,
  amount: 500_00n,             // 500.00 CoffeeCoins
  recipientId: new Identifier('RECIPIENT_IDENTITY_ID'),
  identityId: new Identifier(identityId),
  identityKey,
  signer,
});

// ──────────────────────────────────────────────
// Step 4: Check balances
// ──────────────────────────────────────────────

// Check your own balance
const myBalances = await sdk.tokens.identityBalances(identityId, [tokenId]);
// Map keys are Identifier objects — iterate to find by string
let myBalance = 0n;
for (const [id, balance] of myBalances.entries()) {
  if (id.toString() === tokenId) myBalance = balance;
}
console.log('My balance:', Number(myBalance) / 100, 'CoffeeCoins');

// Check multiple identities at once
const balances = await sdk.tokens.balances(
  [identityId, 'OTHER_IDENTITY_ID'],
  tokenId,
);

for (const [id, balance] of balances) {
  console.log(`${id.toString()}: ${Number(balance) / 100} CoffeeCoins`);
}

// Check total supply
const supply = await sdk.tokens.totalSupply(tokenId);
if (supply) {
  console.log('Total supply:', supply);
}

// ──────────────────────────────────────────────
// Step 5: Transfer tokens
// ──────────────────────────────────────────────

await sdk.tokens.transfer({
  dataContractId: new Identifier(contractId),
  tokenPosition: 0,
  amount: 25_00n,              // 25.00 CoffeeCoins
  recipientId: new Identifier('RECIPIENT_IDENTITY_ID'),
  senderId: new Identifier(identityId),
  identityKey,
  signer,
});

console.log('Transferred 25 CoffeeCoins');

// ──────────────────────────────────────────────
// Step 6: Burn tokens
// ──────────────────────────────────────────────

await sdk.tokens.burn({
  dataContractId: new Identifier(contractId),
  tokenPosition: 0,
  amount: 100_00n,             // 100.00 CoffeeCoins
  identityId: new Identifier(identityId),
  identityKey,
  signer,
});

console.log('Burned 100 CoffeeCoins');

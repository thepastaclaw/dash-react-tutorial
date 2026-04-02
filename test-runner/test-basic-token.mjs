/**
 * Exact code that ran successfully on testnet.
 * Published contract: EiVuRbU3d9ANGjnNokBJamMDGaL9QdPBsV44fUeMPMNy
 * Token ID: AmyDrLavqJcPLgU7K6NxCLom7JJKi96q5fZMMuxtBRkF
 */
import { EvoSDK, DataContract, IdentitySigner, Identifier,
  TokenConfigurationConvention, TokenConfigurationLocalization, TokenConfiguration,
  ChangeControlRules, AuthorizedActionTakers, TokenDistributionRules,
  TokenKeepsHistoryRules, TokenMarketplaceRules, TokenTradeMode } from '@dashevo/evo-sdk';

const sdk = EvoSDK.testnetTrusted(); await sdk.connect();
const IDENTITY_ID = 'HHjmkbcwqFzToaoyvQcP45JZro7PoczAv7Nii57uYPX1';
const identity = await sdk.identities.fetch(IDENTITY_ID);

// HIGH key for contract publish
const highKey = identity.publicKeys[1];
const highSigner = new IdentitySigner();
highSigner.addKeyFromWif('cT1DF1icxCLhksMDMEXikv1XpJjc7GfQTmq145HE5p9VbECAzN7Y');

// CRITICAL key for token ops
const criticalKey = identity.publicKeys[2];
const criticalSigner = new IdentitySigner();
criticalSigner.addKeyFromWif('cSgMJcZkkv7YAMYaPxuxNZnuwB7oakUwLT7ae6MDskXp4dVQyJrr');

console.log('=== BASIC TOKEN TUTORIAL TEST ===\n');
console.log('Balance:', identity.balance.toString(), 'credits');

// Token config — NOTE: only 2 fields passed to ChangeControlRules, works fine
const loc = new TokenConfigurationLocalization(true, 'CoffeeCoin', 'CoffeeCoins');
const conv = new TokenConfigurationConvention({ en: loc }, 2);
const ownerOnly = new ChangeControlRules({ authorizedToMakeChange: AuthorizedActionTakers.ContractOwner(), adminActionTakers: AuthorizedActionTakers.ContractOwner() });
const noOne = new ChangeControlRules({ authorizedToMakeChange: AuthorizedActionTakers.NoOne(), adminActionTakers: AuthorizedActionTakers.NoOne() });

const tokenConfig = new TokenConfiguration({
  conventions: conv, conventionsChangeRules: noOne,
  baseSupply: 0n, maxSupply: 1_000_000_00n, maxSupplyChangeRules: noOne,
  keepsHistory: new TokenKeepsHistoryRules({ isKeepingMintingHistory: true, isKeepingBurningHistory: true, isKeepingTransferHistory: true }),
  distributionRules: new TokenDistributionRules({ perpetualDistributionRules: noOne, newTokensDestinationIdentityRules: noOne, mintingAllowChoosingDestination: true, mintingAllowChoosingDestinationRules: noOne, changeDirectPurchasePricingRules: noOne }),
  marketplaceRules: new TokenMarketplaceRules(TokenTradeMode.NotTradeable(), noOne),
  manualMintingRules: ownerOnly, manualBurningRules: ownerOnly,
  freezeRules: noOne, unfreezeRules: noOne, destroyFrozenFundsRules: noOne, emergencyActionRules: noOne,
  mainControlGroupCanBeModified: AuthorizedActionTakers.NoOne(),
});

// Publish
const nonce = await sdk.identities.nonce(IDENTITY_ID);
const dc = new DataContract({
  ownerId: IDENTITY_ID, identityNonce: nonce + 1n,
  schemas: { tokenMetadata: { type: 'object', properties: { tokenName: { type: 'string', maxLength: 63, position: 0 }, description: { type: 'string', maxLength: 256, position: 1 } }, additionalProperties: false } },
  tokens: { 0: tokenConfig },
});

const contract = await sdk.contracts.publish({ dataContract: dc, identityKey: highKey, signer: highSigner });
const contractId = contract.id.toString();
console.log('Contract published:', contractId);

const tokenId = await sdk.tokens.calculateId(contractId, 0);
console.log('Token ID:', tokenId);

// Mint
console.log('\nMinting 10,000.00 CoffeeCoins...');
await sdk.tokens.mint({
  dataContractId: new Identifier(contractId), tokenPosition: 0,
  amount: 10_000_00n, recipientId: new Identifier(IDENTITY_ID),
  identityId: new Identifier(IDENTITY_ID), identityKey: criticalKey, signer: criticalSigner,
});
console.log('Minted!');

// Check balance
const balances = await sdk.tokens.identityBalances(IDENTITY_ID, [tokenId]);
let myBalance = 0n;
for (const [id, bal] of balances.entries()) { if (id.toString() === tokenId) myBalance = bal; }
console.log('Balance:', Number(myBalance) / 100, 'CoffeeCoins');

// Burn
console.log('\nBurning 100.00 CoffeeCoins...');
await sdk.tokens.burn({
  dataContractId: new Identifier(contractId), tokenPosition: 0,
  amount: 100_00n, identityId: new Identifier(IDENTITY_ID),
  identityKey: criticalKey, signer: criticalSigner,
});
console.log('Burned!');

// Final balance
const bal2 = await sdk.tokens.identityBalances(IDENTITY_ID, [tokenId]);
for (const [id, bal] of bal2.entries()) { if (id.toString() === tokenId) console.log('Final balance:', Number(bal) / 100, 'CoffeeCoins'); }

console.log('\n=== BASIC TOKEN: ALL STEPS PASSED ===');
process.exit(0);

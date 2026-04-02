/**
 * Exact code that ran successfully on testnet.
 * Published contract: 2GntY9SSk9BT81LhLGiExxLY3Vzv5seHSjz2fvH9z8LC
 * Gem token: 4mAQSVhgP5aeVBASSRdKGXrCjzPW4qWpFMkBG1fvTUCy
 */
import { EvoSDK, DataContract, Document, IdentitySigner, Identifier,
  TokenConfigurationConvention, TokenConfigurationLocalization, TokenConfiguration,
  ChangeControlRules, AuthorizedActionTakers, TokenDistributionRules,
  TokenKeepsHistoryRules, TokenMarketplaceRules, TokenTradeMode } from '@dashevo/evo-sdk';

const sdk = EvoSDK.testnetTrusted(); await sdk.connect();
const ID = 'HHjmkbcwqFzToaoyvQcP45JZro7PoczAv7Nii57uYPX1';
const identity = await sdk.identities.fetch(ID);

const highKey = identity.publicKeys[1];
const highSigner = new IdentitySigner();
highSigner.addKeyFromWif('cT1DF1icxCLhksMDMEXikv1XpJjc7GfQTmq145HE5p9VbECAzN7Y');

const critKey = identity.publicKeys[2];
const critSigner = new IdentitySigner();
critSigner.addKeyFromWif('cSgMJcZkkv7YAMYaPxuxNZnuwB7oakUwLT7ae6MDskXp4dVQyJrr');

console.log('=== CARD GAME TUTORIAL TEST ===\n');
console.log('Balance:', identity.balance.toString());

// Token config — same pattern, only 2 fields in ChangeControlRules
const loc = new TokenConfigurationLocalization(true, 'Gem', 'Gems');
const conv = new TokenConfigurationConvention({ en: loc }, 0);
const own = new ChangeControlRules({ authorizedToMakeChange: AuthorizedActionTakers.ContractOwner(), adminActionTakers: AuthorizedActionTakers.ContractOwner() });
const no = new ChangeControlRules({ authorizedToMakeChange: AuthorizedActionTakers.NoOne(), adminActionTakers: AuthorizedActionTakers.NoOne() });
const tok = new TokenConfiguration({
  conventions: conv, conventionsChangeRules: no, baseSupply: 0n, maxSupply: 10_000_000n, maxSupplyChangeRules: no,
  keepsHistory: new TokenKeepsHistoryRules({ isKeepingMintingHistory: true, isKeepingTransferHistory: true }),
  distributionRules: new TokenDistributionRules({ perpetualDistributionRules: no, newTokensDestinationIdentityRules: no, mintingAllowChoosingDestination: true, mintingAllowChoosingDestinationRules: no, changeDirectPurchasePricingRules: no }),
  marketplaceRules: new TokenMarketplaceRules(TokenTradeMode.NotTradeable(), no),
  manualMintingRules: own, manualBurningRules: own,
  freezeRules: no, unfreezeRules: no, destroyFrozenFundsRules: no, emergencyActionRules: no,
  mainControlGroupCanBeModified: AuthorizedActionTakers.NoOne(),
});

const nonce = await sdk.identities.nonce(ID);
const dc = new DataContract({
  ownerId: ID, identityNonce: nonce + 1n,
  schemas: {
    card: { type: 'object', properties: {
      name: { type: 'string', maxLength: 63, position: 0 },
      element: { type: 'string', maxLength: 10, enum: ['fire','water','earth','air','shadow'], position: 1 },
      rarity: { type: 'string', maxLength: 10, enum: ['common','uncommon','rare','legendary'], position: 2 },
      power: { type: 'integer', minimum: 1, maximum: 100, position: 3 },
      defense: { type: 'integer', minimum: 1, maximum: 100, position: 4 },
      ability: { type: 'string', maxLength: 128, position: 5 },
      edition: { type: 'integer', minimum: 1, position: 6 },
    }, required: ['name','element','rarity','power','defense','edition'], additionalProperties: false },
    match: { type: 'object', properties: {
      player1Id: { type: 'string', maxLength: 44, position: 0 },
      player2Id: { type: 'string', maxLength: 44, position: 1 },
      winnerId: { type: 'string', maxLength: 44, position: 2 },
      player1Score: { type: 'integer', minimum: 0, position: 3 },
      player2Score: { type: 'integer', minimum: 0, position: 4 },
      timestamp: { type: 'integer', position: 5 },
    }, required: ['player1Id','player2Id','winnerId','timestamp'], additionalProperties: false },
  },
  tokens: { 0: tok },
});

const contract = await sdk.contracts.publish({ dataContract: dc, identityKey: highKey, signer: highSigner });
const cid = contract.id.toString();
const gemId = await sdk.tokens.calculateId(cid, 0);
console.log('Contract:', cid);
console.log('Gem token:', gemId);

// Mint 100 Gems
console.log('\nMinting 100 Gems...');
await sdk.tokens.mint({
  dataContractId: new Identifier(cid), tokenPosition: 0, amount: 100n,
  recipientId: new Identifier(ID), identityId: new Identifier(ID),
  identityKey: critKey, signer: critSigner,
});
console.log('Minted!');

// Create cards
console.log('\nCreating cards...');
const cards = [
  { name: 'Flame Sprite', element: 'fire', rarity: 'common', power: 15, defense: 10, edition: 1 },
  { name: 'Tidal Guardian', element: 'water', rarity: 'common', power: 10, defense: 20, edition: 1 },
];
for (const card of cards) {
  const doc = new Document({ documentTypeName: 'card', dataContractId: cid, ownerId: ID, properties: card });
  await sdk.documents.create({ document: doc, identityKey: highKey, signer: highSigner });
  console.log('  Created:', card.name);
}

// Query cards
const cardResults = await sdk.documents.query({ dataContractId: cid, documentTypeName: 'card', limit: 10 });
console.log('\nCards found:', cardResults.size);
for (const [id, d] of cardResults) { if (d) console.log(' ', d.properties.name, '-', d.properties.element, '- ATK:' + d.properties.power, 'DEF:' + d.properties.defense); }

// Record a match
console.log('\nRecording match...');
const matchDoc = new Document({
  documentTypeName: 'match', dataContractId: cid, ownerId: ID,
  properties: { player1Id: ID, player2Id: ID, winnerId: ID, player1Score: 3, player2Score: 1, timestamp: Date.now() },
});
await sdk.documents.create({ document: matchDoc, identityKey: highKey, signer: highSigner });
console.log('Match recorded!');

// Reward winner
console.log('Rewarding winner with 10 Gems...');
await sdk.tokens.mint({
  dataContractId: new Identifier(cid), tokenPosition: 0, amount: 10n,
  recipientId: new Identifier(ID), identityId: new Identifier(ID),
  identityKey: critKey, signer: critSigner,
});
console.log('Rewarded!');

// Final balance
const bal = await sdk.tokens.identityBalances(ID, [gemId]);
for (const [id, b] of bal.entries()) { if (id.toString() === gemId) console.log('\nGem balance:', Number(b), 'Gems'); }

console.log('\n=== CARD GAME: ALL STEPS PASSED ===');
process.exit(0);

/**
 * Tutorial: Card Game with Tokens
 *
 * Corrected to match the actual @dashevo/evo-sdk@3.1.0-dev.1 API.
 * Original: https://dashpay.github.io/platform/evo-sdk/tutorials/card-game.html
 */

import {
  EvoSDK,
  DataContract,
  Document,
  Identifier,
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
} from '@dashevo/evo-sdk';

// ──────────────────────────────────────────────
// Step 1: Design the game contract
// ──────────────────────────────────────────────

const gameSchema = {
  card: {
    type: 'object',
    properties: {
      name:    { type: 'string', maxLength: 64 },
      element: { type: 'string', enum: ['fire', 'water', 'earth', 'air', 'shadow'] },
      rarity:  { type: 'string', enum: ['common', 'uncommon', 'rare', 'legendary'] },
      power:   { type: 'integer', minimum: 1, maximum: 100 },
      defense: { type: 'integer', minimum: 1, maximum: 100 },
      ability: { type: 'string', maxLength: 128 },
      edition: { type: 'integer', minimum: 1 },
    },
    required: ['name', 'element', 'rarity', 'power', 'defense', 'edition'],
    additionalProperties: false,
  },
  deck: {
    type: 'object',
    properties: {
      name:    { type: 'string', maxLength: 64 },
      cardIds: {
        type: 'array',
        items: { type: 'string', maxLength: 44 },
        minItems: 5,
        maxItems: 10,
      },
    },
    required: ['name', 'cardIds'],
    additionalProperties: false,
  },
  match: {
    type: 'object',
    properties: {
      player1Id:    { type: 'string', maxLength: 44 },
      player2Id:    { type: 'string', maxLength: 44 },
      winnerId:     { type: 'string', maxLength: 44 },
      player1Score: { type: 'integer', minimum: 0 },
      player2Score: { type: 'integer', minimum: 0 },
      timestamp:    { type: 'integer' },
    },
    required: ['player1Id', 'player2Id', 'winnerId', 'timestamp'],
    additionalProperties: false,
  },
};

// Build the GemToken configuration
const gemLocalization = new TokenConfigurationLocalization(
  true, 'Gem', 'Gems',
);
const gemConventions = new TokenConfigurationConvention(
  { en: gemLocalization },
  0, // whole numbers only
);

const ownerOnly = new ChangeControlRules({
  authorizedToMakeChange: AuthorizedActionTakers.ContractOwner(),
  adminActionTakers: AuthorizedActionTakers.ContractOwner(),
});
const noOne = new ChangeControlRules({
  authorizedToMakeChange: AuthorizedActionTakers.NoOne(),
  adminActionTakers: AuthorizedActionTakers.NoOne(),
});

const gemTokenConfig = new TokenConfiguration({
  conventions: gemConventions,
  conventionsChangeRules: noOne,
  baseSupply: 0n,
  maxSupply: 10_000_000n, // 10 million Gems total
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
// Step 2: Deploy the contract
// ──────────────────────────────────────────────

const sdk = EvoSDK.testnetTrusted();
await sdk.connect();

// Game operator identity
const operatorId = 'OPERATOR_IDENTITY_ID';
const operatorKeyWif = 'OPERATOR_PRIVATE_KEY_WIF';

const operatorIdentity = await sdk.identities.fetch(operatorId);
if (!operatorIdentity) throw new Error('Operator identity not found');

const operatorKey = operatorIdentity.publicKeys[0];
const operatorSigner = new IdentitySigner();
operatorSigner.addKeyFromWif(operatorKeyWif);

const identityNonce = await sdk.identities.nonce(operatorId);
if (identityNonce === undefined) throw new Error('Could not fetch nonce');

const dataContract = new DataContract({
  ownerId: operatorId,
  identityNonce,
  schemas: gameSchema,
  tokens: { 0: gemTokenConfig },
});

const contract = await sdk.contracts.publish({
  dataContract,
  identityKey: operatorKey,
  signer: operatorSigner,
});

const contractId = contract.id.toString();
const gemTokenId = await sdk.tokens.calculateId(contractId, 0);

console.log('Game contract:', contractId);
console.log('Gem token:', gemTokenId);

// ──────────────────────────────────────────────
// Step 3: Mint starter Gems for a new player
// ──────────────────────────────────────────────

async function onboardPlayer(playerId: string) {
  await sdk.tokens.mint({
    dataContractId: new Identifier(contractId),
    tokenPosition: 0,
    amount: 100n,
    recipientId: new Identifier(playerId),
    identityId: new Identifier(operatorId),
    identityKey: operatorKey,
    signer: operatorSigner,
  });

  console.log(`Welcomed ${playerId} with 100 Gems`);
}

// ──────────────────────────────────────────────
// Step 4: Create a card pack (operator mints cards)
// ──────────────────────────────────────────────

const starterPack = [
  { name: 'Flame Sprite',    element: 'fire',   rarity: 'common',   power: 15, defense: 10, edition: 1 },
  { name: 'Tidal Guardian',  element: 'water',  rarity: 'common',   power: 10, defense: 20, edition: 1 },
  { name: 'Stone Golem',     element: 'earth',  rarity: 'uncommon', power: 25, defense: 30, edition: 1 },
  { name: 'Wind Dancer',     element: 'air',    rarity: 'common',   power: 20, defense: 12, edition: 1 },
  { name: 'Shadow Wraith',   element: 'shadow', rarity: 'rare',     power: 40, defense: 15, edition: 1 },
];

async function createCards(cards: typeof starterPack) {
  for (const card of cards) {
    const cardDoc = new Document({
      documentTypeName: 'card',
      dataContractId: contractId,
      ownerId: operatorId,
      properties: card,
    });

    await sdk.documents.create({
      document: cardDoc,
      identityKey: operatorKey,
      signer: operatorSigner,
    });
    console.log(`Created: ${card.name} (${card.rarity})`);
  }
}

await createCards(starterPack);

// ──────────────────────────────────────────────
// Step 5: Player buys a card pack
// ──────────────────────────────────────────────

const PACK_PRICE = 50n; // 50 Gems per pack

async function buyPack(playerId: string, playerKeyWif: string) {
  // Set up player signer
  const playerIdentity = await sdk.identities.fetch(playerId);
  if (!playerIdentity) throw new Error('Player identity not found');

  const playerKey = playerIdentity.publicKeys[0];
  const playerSigner = new IdentitySigner();
  playerSigner.addKeyFromWif(playerKeyWif);

  // Player pays Gems to the operator
  await sdk.tokens.transfer({
    dataContractId: new Identifier(contractId),
    tokenPosition: 0,
    amount: PACK_PRICE,
    recipientId: new Identifier(operatorId),
    senderId: new Identifier(playerId),
    identityKey: playerKey,
    signer: playerSigner,
  });
  console.log(`Player paid ${PACK_PRICE} Gems`);

  // Operator transfers cards to the player
  const availableCards = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: 'card',
    where: [['$ownerId', '==', operatorId]],
    limit: 5,
  });

  for (const [, card] of availableCards) {
    if (!card) continue;

    await sdk.documents.transfer({
      document: card,
      recipientId: new Identifier(playerId),
      identityKey: operatorKey,
      signer: operatorSigner,
    });
    const data = card.properties as Record<string, unknown>;
    console.log(`Transferred ${data.name} to player`);
  }
}

// ──────────────────────────────────────────────
// Step 6: Query a player's collection
// ──────────────────────────────────────────────

async function getCollection(playerId: string) {
  const cards = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: 'card',
    where: [['$ownerId', '==', playerId]],
    orderBy: [['power', 'desc']],
    limit: 100,
  });

  console.log(`\n${playerId}'s collection:`);
  for (const [, card] of cards) {
    if (!card) continue;
    const d = card.properties as Record<string, unknown>;
    console.log(`  [${d.rarity}] ${d.name} — ${d.element} — ATK:${d.power} DEF:${d.defense}`);
  }

  return cards;
}

// Filter by rarity
async function getLegendaries(playerId: string) {
  const legendaries = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: 'card',
    where: [
      ['$ownerId', '==', playerId],
      ['rarity', '==', 'legendary'],
    ],
    limit: 50,
  });
  return legendaries;
}

// ──────────────────────────────────────────────
// Step 7: Trade cards between players
// ──────────────────────────────────────────────

async function tradeCards(
  fromId: string, fromKeyWif: string, fromCardId: string,
  toId: string, toKeyWif: string, toCardId: string,
) {
  // Set up signers
  const fromIdentity = await sdk.identities.fetch(fromId);
  const toIdentity = await sdk.identities.fetch(toId);
  if (!fromIdentity || !toIdentity) throw new Error('Identity not found');

  const fromKey = fromIdentity.publicKeys[0];
  const fromSigner = new IdentitySigner();
  fromSigner.addKeyFromWif(fromKeyWif);

  const toKey = toIdentity.publicKeys[0];
  const toSigner = new IdentitySigner();
  toSigner.addKeyFromWif(toKeyWif);

  // Fetch both card documents
  const fromCard = await sdk.documents.get(contractId, 'card', fromCardId);
  const toCard = await sdk.documents.get(contractId, 'card', toCardId);
  if (!fromCard || !toCard) throw new Error('Card not found');

  // Player A sends their card to Player B
  await sdk.documents.transfer({
    document: fromCard,
    recipientId: new Identifier(toId),
    identityKey: fromKey,
    signer: fromSigner,
  });

  // Player B sends their card to Player A
  await sdk.documents.transfer({
    document: toCard,
    recipientId: new Identifier(fromId),
    identityKey: toKey,
    signer: toSigner,
  });

  console.log('Trade complete!');
}

// ──────────────────────────────────────────────
// Step 8: Record a match result
// ──────────────────────────────────────────────

async function recordMatch(
  player1Id: string, player2Id: string,
  winnerId: string,
  p1Score: number, p2Score: number,
) {
  const matchDoc = new Document({
    documentTypeName: 'match',
    dataContractId: contractId,
    ownerId: operatorId,
    properties: {
      player1Id,
      player2Id,
      winnerId,
      player1Score: p1Score,
      player2Score: p2Score,
      timestamp: Date.now(),
    },
  });

  await sdk.documents.create({
    document: matchDoc,
    identityKey: operatorKey,
    signer: operatorSigner,
  });

  // Reward the winner with Gems
  await sdk.tokens.mint({
    dataContractId: new Identifier(contractId),
    tokenPosition: 0,
    amount: 10n,
    recipientId: new Identifier(winnerId),
    identityId: new Identifier(operatorId),
    identityKey: operatorKey,
    signer: operatorSigner,
  });

  console.log(`Match recorded. ${winnerId} wins and earns 10 Gems!`);
}

// ──────────────────────────────────────────────
// Step 9: Leaderboard
// ──────────────────────────────────────────────

async function getWinCounts() {
  const matches = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: 'match',
    orderBy: [['timestamp', 'desc']],
    limit: 100,
  });

  const wins = new Map<string, number>();
  for (const [, doc] of matches) {
    if (!doc) continue;
    const data = doc.properties as Record<string, unknown>;
    const winner = data.winnerId as string;
    wins.set(winner, (wins.get(winner) ?? 0) + 1);
  }

  // Sort by wins descending
  const sorted = [...wins.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nLeaderboard:');
  sorted.forEach(([id, count], i) => {
    console.log(`  ${i + 1}. ${id.slice(0, 8)}... — ${count} wins`);
  });
}

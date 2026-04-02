/**
 * Tutorial: Card Game with Tokens
 *
 * Original code from: https://dashpay.github.io/platform/evo-sdk/tutorials/card-game.html
 * NOTE: This code does NOT compile against @dashevo/evo-sdk@3.1.0-dev.1
 */

// @ts-nocheck — original tutorial code, kept verbatim for diffing

import { EvoSDK } from '@dashevo/evo-sdk';

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
      player1Id:  { type: 'string', maxLength: 44 },
      player2Id:  { type: 'string', maxLength: 44 },
      winnerId:   { type: 'string', maxLength: 44 },
      player1Score: { type: 'integer', minimum: 0 },
      player2Score: { type: 'integer', minimum: 0 },
      timestamp:  { type: 'integer' },
    },
    required: ['player1Id', 'player2Id', 'winnerId', 'timestamp'],
    additionalProperties: false,
  },
};

const gemTokenConfig = {
  conventions: {
    localizations: {
      en: {
        shouldCapitalize: true,
        singularForm: 'Gem',
        pluralForm: 'Gems',
      },
    },
    decimals: 0, // whole numbers only
  },
  manualMinting: {
    rules: { type: 'ownerOnly' },
  },
  manualBurning: {
    rules: { type: 'ownerOnly' },
  },
  maxSupply: 10_000_000, // 10 million Gems total
};

// ──────────────────────────────────────────────
// Step 2: Deploy the contract
// ──────────────────────────────────────────────

const sdk = EvoSDK.testnetTrusted();
await sdk.connect();

// Game operator identity
const operatorId = 'OPERATOR_IDENTITY_ID';
const operatorKey = 'OPERATOR_PRIVATE_KEY_WIF';

const contract = await sdk.contracts.publish({
  identityId: operatorId,
  documentSchemas: gameSchema,
  tokens: [gemTokenConfig],
  privateKeyWif: operatorKey,
  signingKeyIndex: 0,
  nonce: await sdk.identities.nonce(operatorId),
});

const contractId = contract.getId().toString();
const gemTokenId = await sdk.tokens.calculateId(contractId, 0);

console.log('Game contract:', contractId);
console.log('Gem token:', gemTokenId);

// ──────────────────────────────────────────────
// Step 3: Mint starter Gems for a new player
// ──────────────────────────────────────────────

async function onboardPlayer(playerId: string) {
  // Gift 100 Gems to the new player
  await sdk.tokens.mint({
    tokenId: gemTokenId,
    amount: 100,
    recipientId: playerId,
    identityId: operatorId,
    privateKeyWif: operatorKey,
    signingKeyIndex: 0,
    nonce: await sdk.identities.nonce(operatorId),
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
    await sdk.documents.create({
      contractId,
      documentType: 'card',
      document: card,
      identityId: operatorId,
      privateKeyWif: operatorKey,
      signingKeyIndex: 0,
      nonce: await sdk.identities.contractNonce(operatorId, contractId),
    });
    console.log(`Created: ${card.name} (${card.rarity})`);
  }
}

await createCards(starterPack);

// ──────────────────────────────────────────────
// Step 5: Player buys a card pack
// ──────────────────────────────────────────────

const PACK_PRICE = 50; // 50 Gems per pack

async function buyPack(playerId: string, playerKey: string) {
  // Player pays Gems to the operator
  await sdk.tokens.transfer({
    tokenId: gemTokenId,
    amount: PACK_PRICE,
    recipientId: operatorId,
    identityId: playerId,
    privateKeyWif: playerKey,
    signingKeyIndex: 0,
    nonce: await sdk.identities.nonce(playerId),
  });
  console.log(`Player paid ${PACK_PRICE} Gems`);

  // Operator transfers cards to the player
  // (In production, select random cards from available pool)
  const availableCards = await sdk.documents.query({
    contractId,
    documentType: 'card',
    where: [['$ownerId', '==', operatorId]],
    limit: 5,
  });

  for (const [cardId, card] of availableCards) {
    if (!card) continue;
    await sdk.documents.transfer({
      contractId,
      documentType: 'card',
      documentId: cardId,
      recipientId: playerId,
      identityId: operatorId,
      privateKeyWif: operatorKey,
      signingKeyIndex: 0,
      nonce: await sdk.identities.contractNonce(operatorId, contractId),
    });
    console.log(`Transferred ${card.getData().name} to player`);
  }
}

// ──────────────────────────────────────────────
// Step 6: Query a player's collection
// ──────────────────────────────────────────────

async function getCollection(playerId: string) {
  const cards = await sdk.documents.query({
    contractId,
    documentType: 'card',
    where: [['$ownerId', '==', playerId]],
    orderBy: [['power', 'desc']],
    limit: 100,
  });

  console.log(`\n${playerId}'s collection:`);
  for (const [id, card] of cards) {
    if (!card) continue;
    const d = card.getData();
    console.log(`  [${d.rarity}] ${d.name} — ${d.element} — ATK:${d.power} DEF:${d.defense}`);
  }

  return cards;
}

// Filter by rarity
async function getLegendaries(playerId: string) {
  const legendaries = await sdk.documents.query({
    contractId,
    documentType: 'card',
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
  fromId: string, fromKey: string, fromCardId: string,
  toId: string, toKey: string, toCardId: string,
) {
  // Player A sends their card to Player B
  await sdk.documents.transfer({
    contractId,
    documentType: 'card',
    documentId: fromCardId,
    recipientId: toId,
    identityId: fromId,
    privateKeyWif: fromKey,
    signingKeyIndex: 0,
    nonce: await sdk.identities.contractNonce(fromId, contractId),
  });

  // Player B sends their card to Player A
  await sdk.documents.transfer({
    contractId,
    documentType: 'card',
    documentId: toCardId,
    recipientId: fromId,
    identityId: toId,
    privateKeyWif: toKey,
    signingKeyIndex: 0,
    nonce: await sdk.identities.contractNonce(toId, contractId),
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
  await sdk.documents.create({
    contractId,
    documentType: 'match',
    document: {
      player1Id,
      player2Id,
      winnerId,
      player1Score: p1Score,
      player2Score: p2Score,
      timestamp: Date.now(),
    },
    identityId: operatorId,
    privateKeyWif: operatorKey,
    signingKeyIndex: 0,
    nonce: await sdk.identities.contractNonce(operatorId, contractId),
  });

  // Reward the winner with Gems
  await sdk.tokens.mint({
    tokenId: gemTokenId,
    amount: 10,
    recipientId: winnerId,
    identityId: operatorId,
    privateKeyWif: operatorKey,
    signingKeyIndex: 0,
    nonce: await sdk.identities.nonce(operatorId),
  });

  console.log(`Match recorded. ${winnerId} wins and earns 10 Gems!`);
}

// ──────────────────────────────────────────────
// Step 9: Leaderboard
// ──────────────────────────────────────────────

async function getWinCounts() {
  const matches = await sdk.documents.query({
    contractId,
    documentType: 'match',
    orderBy: [['timestamp', 'desc']],
    limit: 100,
  });

  const wins = new Map<string, number>();
  for (const [, doc] of matches) {
    if (!doc) continue;
    const winner = doc.getData().winnerId;
    wins.set(winner, (wins.get(winner) ?? 0) + 1);
  }

  // Sort by wins descending
  const sorted = [...wins.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nLeaderboard:');
  sorted.forEach(([id, count], i) => {
    console.log(`  ${i + 1}. ${id.slice(0, 8)}... — ${count} wins`);
  });
}

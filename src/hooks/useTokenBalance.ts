import { useDashQuery } from './useDashQuery';

export function useTokenBalance(identityId: string, tokenId: string) {
  return useDashQuery(
    async (sdk) => {
      const balances = await sdk.tokens.identityBalances(identityId, [tokenId]);
      // Map keys are Identifier objects; find the matching entry by string comparison
      for (const [id, balance] of balances.entries()) {
        if (id.toString() === tokenId) return balance;
      }
      return 0n;
    },
    [identityId, tokenId],
  );
}

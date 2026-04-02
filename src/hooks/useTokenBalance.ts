import { useDashQuery } from './useDashQuery';

export function useTokenBalance(identityId: string, tokenId: string) {
  return useDashQuery(
    async (sdk) => {
      const balances = await sdk.tokens.identityBalances(identityId, [tokenId]);
      return balances.get(tokenId) ?? 0n;
    },
    [identityId, tokenId],
  );
}

import { useDashQuery } from './useDashQuery';

export function useIdentity(identityId: string) {
  return useDashQuery(
    (sdk) => sdk.identities.fetch(identityId),
    [identityId],
  );
}

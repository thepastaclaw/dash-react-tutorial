import { useDashQuery } from './useDashQuery';
import type { DocumentsQuery } from '@dashevo/evo-sdk';

export function useDocuments(query: DocumentsQuery) {
  return useDashQuery(
    (sdk) => sdk.documents.query(query),
    [JSON.stringify(query)],
  );
}

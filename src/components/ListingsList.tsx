import { useDocuments } from '../hooks/useDocuments';

const CONTRACT_ID = 'YOUR_CONTRACT_ID';

export function ListingsList() {
  const { data: results, isLoading, error, refetch } = useDocuments({
    dataContractId: CONTRACT_ID,
    documentTypeName: 'listing',
    where: [['status', '==', 'available']],
    orderBy: [['priceUsd', 'asc']],
    limit: 20,
  });

  if (isLoading) return <p>Loading listings...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!results || results.size === 0) return <p>No listings found.</p>;

  return (
    <div>
      <h2>Available Cars</h2>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {[...results.entries()].map(([id, doc]) => {
          if (!doc) return null;
          const d = doc.properties as Record<string, unknown>;
          return (
            <li key={id.toString()}>
              <strong>{d.year as number} {d.make as string} {d.model as string}</strong> — ${d.priceUsd as number}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

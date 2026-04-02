import { useDocuments } from '../hooks/useDocuments';

const CONTRACT_ID = 'YOUR_CONTRACT_ID';

export function ListingsList() {
  const { data: results, isLoading, error, refetch } = useDocuments({
    contractId: CONTRACT_ID,
    documentType: 'listing',
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
          const d = doc.getData();
          return (
            <li key={id}>
              <strong>{d.year} {d.make} {d.model}</strong> — ${d.priceUsd}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

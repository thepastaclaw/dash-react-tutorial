import { ConnectionStatus } from './components/ConnectionStatus';
import { IdentityViewer } from './components/IdentityViewer';
import { ListingsList } from './components/ListingsList';
import { CreateListing } from './components/CreateListing';
import { useDash } from './DashProvider';

export default function App() {
  const { sdk } = useDash();

  return (
    <div className="app">
      <header>
        <h1>Dash Platform App</h1>
        <ConnectionStatus />
      </header>

      {sdk ? (
        <main>
          <IdentityViewer />
          <ListingsList />
          <CreateListing />
        </main>
      ) : (
        <p>Waiting for SDK connection...</p>
      )}
    </div>
  );
}

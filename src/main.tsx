import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DashProvider } from './DashProvider';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashProvider network="testnet">
      <App />
    </DashProvider>
  </StrictMode>,
);

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { getStoredAuth0Config } from './services/auth0Service'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'
import App from './App.tsx'

const config = getStoredAuth0Config();
const redirectUri = typeof window !== 'undefined'
  ? window.location.origin + window.location.pathname
  : '';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {config.domain && config.clientId ? (
        <Auth0Provider
          domain={config.domain}
          clientId={config.clientId}
          authorizationParams={{
            redirect_uri: redirectUri
          }}
          cacheLocation="localstorage"
        >
          <App />
        </Auth0Provider>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
)

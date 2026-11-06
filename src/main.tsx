import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { getStoredAuth0Config } from './services/auth0Service'
import './index.css'
import App from './App.tsx'

const config = getStoredAuth0Config();
const redirectUri = typeof window !== 'undefined'
  ? window.location.origin + window.location.pathname
  : '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)

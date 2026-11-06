export interface Auth0Config {
  domain: string;
  clientId: string;
}

const STORAGE_AUTH0_CONFIG_KEY = 'kiral_auth0_config_v1';

export const getStoredAuth0Config = (): Auth0Config => {
  try {
    const raw = localStorage.getItem(STORAGE_AUTH0_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.domain && parsed.clientId) return parsed;
    }
  } catch {
    // Ignore
  }
  return {
    domain: import.meta.env.VITE_AUTH0_DOMAIN || '',
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || ''
  };
};

export const saveAuth0Config = (config: Auth0Config) => {
  try {
    localStorage.setItem(STORAGE_AUTH0_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore
  }
};

export const isAuth0Configured = (): boolean => {
  const cfg = getStoredAuth0Config();
  return Boolean(cfg.domain && cfg.clientId);
};

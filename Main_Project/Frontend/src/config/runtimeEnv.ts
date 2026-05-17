type RuntimeEnv = Record<string, string | undefined>;

declare global {
  interface Window {
    __INVESTADVISOR_ENV__?: RuntimeEnv;
  }
}

export function getRuntimeEnv(key: string, fallback = '') {
  if (typeof window !== 'undefined') {
    const runtimeValue = window.__INVESTADVISOR_ENV__?.[key];
    if (runtimeValue !== undefined && runtimeValue !== '') {
      return runtimeValue;
    }
  }

  const buildValue = import.meta.env[key] as string | undefined;
  return buildValue || fallback;
}

export const API_BASE_URL = getRuntimeEnv('VITE_API_URL', '/api');

export function isMockApiEnabled() {
  return getRuntimeEnv('VITE_MOCK_API') === 'true';
}

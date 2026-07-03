/**
 * Staging environment — production-like build deployed from non-master branches.
 */
export const environment = {
  production: false,
  envName: 'staging',
  /** Base URL for the future backend API (empty = same origin, proxied by the host). */
  apiBaseUrl: '/api',
};

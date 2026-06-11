// CloudFront CDN configuration and request caching utility
// Optimizes media loading and network traffic for internal trainees and employees.

// Fetch the CloudFront URL from the environment variables (injected by Vite)
// Fallback to the distribution URL mapped to the S3 bucket hosting frontend assets.
export const CLOUDFRONT_URL = import.meta.env.VITE_CLOUDFRONT_URL || 'https://d123456abcdef8.cloudfront.net';

// A simple in-memory cache to deduplicate parallel API calls and cache request responses.
const requestCache = new Map();

/**
 * Resolves local paths to their CloudFront URL equivalent to load static files and media from the edge.
 * @param {string} path - Local resource path
 * @returns {string} - CloudFront cached resource URL
 */
export const getCDNAsset = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${CLOUDFRONT_URL}/${cleanPath}`;
};

/**
 * Deduplicating fetch utility that requests data through the CloudFront CDN distribution
 * with in-memory caching to prevent duplicate requests during concurrent employee actions.
 * 
 * @param {string} path - Fetch target path
 * @param {object} options - Fetch options
 * @param {number} cacheMaxAgeMs - Cache duration in milliseconds (default: 30000ms / 30s)
 * @returns {Promise<any>}
 */
export const fetchFromCDN = async (path, options = {}, cacheMaxAgeMs = 30000) => {
  const url = getCDNAsset(path);
  const cacheKey = `${url}_${JSON.stringify(options.body || '')}_${options.method || 'GET'}`;
  const cached = requestCache.get(cacheKey);

  // Return cached promise if it exists and has not expired
  if (cached && Date.now() - cached.timestamp < cacheMaxAgeMs) {
    return cached.promise;
  }

  const promise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          // Instruct CloudFront and browser to cache response if supported
          'Cache-Control': `public, max-age=${Math.floor(cacheMaxAgeMs / 1000)}`,
        },
      });

      if (!response.ok) {
        throw new Error(`CloudFront Fetch failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('CloudFront fetch failed, falling back to origin server local request:', err);
      // Clean requestCache key so next attempt tries again
      requestCache.delete(cacheKey);

      // Fallback local fetch
      const localUrl = path.startsWith('/') ? path : `/${path}`;
      const fallbackResponse = await fetch(localUrl, options);
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback local fetch failed with status ${fallbackResponse.status}`);
      }
      return await fallbackResponse.json();
    }
  })();

  requestCache.set(cacheKey, {
    promise,
    timestamp: Date.now(),
  });

  return promise;
};

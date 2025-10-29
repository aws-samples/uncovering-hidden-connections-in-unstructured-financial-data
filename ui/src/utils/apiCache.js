/**
 * Simple in-memory cache for API requests with TTL (Time To Live)
 * Reduces redundant API calls and improves performance
 */

class ApiCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from URL and options
   */
  generateKey(url, options = {}) {
    const { headers, method = 'GET' } = options;
    const keyData = {
      url,
      method,
      // Include relevant headers that affect response
      apiKey: headers?.['x-api-key'] || ''
    };
    return JSON.stringify(keyData);
  }

  /**
   * Get cached response if valid
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store response in cache
   */
  set(key, data, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now()
    });
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries
    };
  }
}

// Create singleton instance
const apiCache = new ApiCache();

// Cleanup expired entries every 2 minutes
setInterval(() => {
  apiCache.cleanup();
}, 2 * 60 * 1000);

/**
 * Cached fetch wrapper
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @param {number} ttl - Cache TTL in milliseconds
 * @returns {Promise} - Fetch response
 */
export const cachedFetch = async (url, options = {}, ttl) => {
  const cacheKey = apiCache.generateKey(url, options);
  
  // Try to get from cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    // Return cached response as a resolved promise
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(cached)
    });
  }

  // Make actual request
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache successful responses
    apiCache.set(cacheKey, data, ttl);
    
    // Return response in same format as fetch
    return {
      ok: true,
      json: () => Promise.resolve(data)
    };
  } catch (error) {
    // Don't cache errors, just throw them
    throw error;
  }
};

export default apiCache;
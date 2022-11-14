// Class-ified from:
// https://gist.github.com/lesleh/9d66bc87f22bf5e28997

function now() {
  return new Date().getTime() / 1000;
};

/**
 * Object for holding a value and an expiration time
 * @param expires the expiry time as a UNIX timestamp
 * @param value the value of the cache entry
 * @constructor ¯\(°_o)/¯
 */
class CacheEntry {
  constructor(expires, value) {
    this.expires = expires;
    this.value = value;
  }
}

/**
 * Cache
 */
class Cache {

  /**
   * Create a new Cache
   * @param {object} config config
   * @param {number} config.ttl time in seconds the entries are valid
   * @param {number} config.trim time in seconds to clear old records
   */
  constructor(config) {
    this.config = config || {};
    this.config.ttl = config.ttl || 60 * 60; //seconds
    this.config.trim = config.trim || 10 * 60; // seconds

    this.data = {};
    // Periodical cleanup
    this.timer = setInterval(this.trim, this.config.trim * 1000);
  }

  /**
   * Returns an Array of all currently set keys.
   * @returns {Array} cache keys
   */
  keys() {
    const keys = [];
    for (let key in this.data)
      if (this.data.hasOwnProperty(key))
        keys.push(key);
    return keys;
  };

  /**
   * Checks if a key is currently set in the cache.
   * @param key the key to look for
   * @returns {boolean} true if set, false otherwise
   */
  has(key) {
    return this.data.hasOwnProperty(key);
  };

  /**
   * Clears all cache entries.
   */
  clear() {
    for (let key in this.data)
      if (this.data.hasOwnProperty(key))
        this.remove(key);
  };

  /**
   * Gets the cache entry for the given key.
   * @param key the cache key
   * @returns {*} the cache entry if set, or undefined otherwise
   */
  get(key) {
    return this.data[key].value;
  };

  /**
   * Returns the cache entry if set, or a default value otherwise.
   * @param key the key to retrieve
   * @param def the default value to return if unset
   * @returns {*} the cache entry if set, or the default value provided.
   */
  getOrDefault(key, def) {
    return this.has(key) ? this.data[key].value : def;
  };

  /**
   * Sets a cache entry with the provided key and value.
   * @param key the key to set
   * @param value the value to set
   */
  set(key, value) {
    this.data[key] = new CacheEntry(now() + this.config.ttl, value);
  };

  /**
   * Removes the cache entry for the given key.
   * @param key the key to remove
   */
  remove(key) {
    delete this.data[key];
  };

  /**
   * Checks if the cache entry has expired.
   * @param entrytime the cache entry expiry time
   * @param curr (optional) the current time
   * @returns {boolean} true if expired, false otherwise
   */
  expired(entrytime, curr) {
    if (!curr)
      curr = now();
    return entrytime < curr;
  };

  /**
   * Trims the cache of expired keys. This function is run periodically (see config.ttl).
   */
  trim() {
    var curr = now();
    for (var key in this.data)
      if (this.data.hasOwnProperty(key))
        if (this.expired(data.expires, curr))
          this.remove(key);
  };

  destory() {
    clearInterval(this.timer);
  }
}


module.exports = Cache;
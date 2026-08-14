const PREFIX = "the-market:";

function readRaw(key) {
  return localStorage.getItem(PREFIX + key);
}

window.storage = {
  async get(key, shared = false) {
    const raw = readRaw(key);
    if (raw === null) return null;
    return { key, value: raw, shared };
  },

  async set(key, value, shared = false) {
    localStorage.setItem(PREFIX + key, value);
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const existed = readRaw(key) !== null;
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: existed, shared };
  },

  async list(prefix = "", shared = false) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + prefix)) keys.push(k.slice(PREFIX.length));
    }
    return { keys, prefix, shared };
  },
};

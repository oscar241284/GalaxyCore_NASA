const OLD = 'novacore';
const NEW = 'galaxycore';

try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(OLD)) continue;
    const renamed = NEW + key.slice(OLD.length);
    const value = localStorage.getItem(key);
    if (value !== null && localStorage.getItem(renamed) === null) localStorage.setItem(renamed, value);
    localStorage.removeItem(key);
  }
} catch {
}

export {};

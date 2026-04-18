import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'seen_notice_ids';
const LATEST_KEY = '_latest_notice_ids';
const COUNT_KEY = '_unseen_count';

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  const capped = [...ids].slice(-100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
}

export function useNewNotices() {
  const [newCount, setNewCount] = useState(() => {
    const raw = localStorage.getItem(COUNT_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  });

  useEffect(() => {
    const syncFromStorage = () => {
      const raw = localStorage.getItem(COUNT_KEY);
      if (raw) {
        const val = parseInt(raw, 10) || 0;
        setNewCount(val);
      }
    };

    syncFromStorage();

    const onCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'number') {
        setNewCount(detail);
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === COUNT_KEY) syncFromStorage();
    };

    window.addEventListener('notices:unseenCount', onCustomEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('notices:unseenCount', onCustomEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const markAllAsSeen = useCallback(() => {
    const allIds: string[] = [];
    const raw = localStorage.getItem(LATEST_KEY);
    if (raw) {
      try { allIds.push(...JSON.parse(raw)); } catch { /* */ }
    }
    if (allIds.length === 0) return;
    const seen = getSeenIds();
    for (const id of allIds) {
      seen.add(id);
    }
    saveSeenIds(seen);
    localStorage.setItem(COUNT_KEY, '0');
    setNewCount(0);
  }, []);

  return { newCount, markAllAsSeen };
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import seed from '../data/seed.json';
import resultsFile from '../data/results.json';

// Read-only app. All trip data ships with the app:
//   src/data/seed.json     players, tee times, caddies, courses, dinners (built by scripts/build-seed.mjs)
//   src/data/results.json  match results, posted by Josh via Claude from Marc's scorecards
// Any change is a commit to GitHub; Netlify republishes in a minute or two.

export const TABLES = ['players', 'tee_times', 'settings', 'courses', 'restaurants', 'rooms', 'rsvps', 'announcements', 'dinners'];
const ME_KEY = 'bandon-shoe-me';

const ls = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function buildState() {
  const s = {};
  for (const t of TABLES) s[t] = Object.fromEntries((seed[t] || []).map((r) => [r.id, r]));
  s.results = Object.fromEntries((resultsFile.results || []).map((r) => [r.id, { status: 'posted', ...r }]));
  return s;
}

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [state] = useState(buildState);
  const [meId, setMeId] = useState(() => ls.get(ME_KEY));
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Pick up a newer published version when the app comes back to the foreground.
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const v = await res.json();
        if (v.updated && v.updated !== resultsFile.updated) window.location.reload();
      } catch { /* offline or not deployed yet */ }
    };
    document.addEventListener('visibilitychange', check);
    const iv = setInterval(check, 5 * 60 * 1000);
    return () => { document.removeEventListener('visibilitychange', check); clearInterval(iv); };
  }, []);

  const notify = useCallback((text, tone = 'ok') => {
    setToast({ text, tone, at: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.at > 3500 ? null : t)), 3800);
  }, []);

  const me = useMemo(() => (meId ? state.players?.[meId] || null : null), [state.players, meId]);
  const choosePlayer = useCallback((id) => { setMeId(id); ls.set(ME_KEY, id); }, []);
  const switchPlayer = useCallback(() => { setMeId(null); ls.del(ME_KEY); }, []);
  const list = useCallback((t) => Object.values(state[t] || {}), [state]);
  const settings = state.settings?.main || seed.settings[0];

  const value = {
    ready: true, state, list, settings, me, online, updated: resultsFile.updated,
    choosePlayer, switchPlayer, notify, toast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

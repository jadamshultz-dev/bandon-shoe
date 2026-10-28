import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import seed from '../data/seed.json';
import { ENV } from './env.js';

export const TABLES = ['players', 'tee_times', 'results', 'settings', 'courses', 'restaurants', 'rooms', 'rides', 'rsvps', 'announcements', 'dinners'];

const SUPA_URL = ENV.VITE_SUPABASE_URL;
const SUPA_KEY = ENV.VITE_SUPABASE_ANON_KEY;
export const MODE = ENV.VITE_DEMO === '1' || !SUPA_URL || !SUPA_KEY ? 'demo' : 'live';

const DEMO_KEY = 'bandon-shoe-demo-v13';
const CACHE_KEY = 'bandon-shoe-cache-v3';
const QUEUE_KEY = 'bandon-shoe-queue-v2';
const ME_KEY = 'bandon-shoe-me';
const PIN_KEY = 'bandon-shoe-pin';

// Fields only the admins (Marc, Josh, Mike) can change on a player profile.
export const PROTECTED_PLAYER_FIELDS = ['role', 'team', 'captain', 'index', 'name', 'initials'];

const ls = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function indexSeed() {
  const s = {};
  for (const t of TABLES) s[t] = Object.fromEntries((seed[t] || []).map((r) => [r.id, r]));
  return s;
}

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => (MODE === 'demo' ? ls.get(DEMO_KEY)?.state : ls.get(CACHE_KEY)) || indexSeed());
  const [audit, setAudit] = useState(() => (MODE === 'demo' ? ls.get(DEMO_KEY)?.audit || [] : []));
  const [ready, setReady] = useState(MODE === 'demo' || !!ls.get(CACHE_KEY));
  const [meId, setMeId] = useState(() => ls.get(ME_KEY));
  const [unlock, setUnlock] = useState(() => ls.get(PIN_KEY)); // { pin, role, player }
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [queue, setQueue] = useState(() => ls.get(QUEUE_KEY) || []);
  const [toast, setToast] = useState(null);
  const sb = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const notify = useCallback((text, tone = 'ok') => {
    setToast({ text, tone, at: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.at > 3500 ? null : t)), 3800);
  }, []);

  const applyRow = useCallback((table, id, data) => {
    setState((s) => {
      const next = { ...s, [table]: { ...s[table] } };
      if (data === null) delete next[table][id]; else next[table][id] = { ...data, id };
      if (MODE === 'live') ls.set(CACHE_KEY, next);
      return next;
    });
  }, []);

  // ---------- live mode: load everything, then listen for changes ----------
  const loadAll = useCallback(async () => {
    const client = sb.current; if (!client) return;
    const next = {};
    for (const t of TABLES) {
      const { data, error } = await client.from(t).select('id,data');
      if (error) { notify(isNetwork(error) ? 'No signal. Showing saved data.' : `Could not load ${t}: ${error.message}`, isNetwork(error) ? 'warn' : 'bad'); setReady(true); return; }
      next[t] = Object.fromEntries(data.map((r) => [r.id, { ...r.data, id: r.id }]));
    }
    setState(next); ls.set(CACHE_KEY, next); setReady(true);
  }, [notify]);

  useEffect(() => {
    if (MODE !== 'live') return;
    let ch; let cancelled = false;
    const reload = () => document.visibilityState === 'visible' && loadAll();
    (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      if (cancelled) return;
      sb.current = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
      await loadAll();
      ch = sb.current.channel('bandon-all');
      for (const t of TABLES) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => {
          if (p.eventType === 'DELETE') applyRow(t, p.old.id, null);
          else applyRow(t, p.new.id, p.new.data);
          if (t === 'results' && p.eventType !== 'DELETE' && p.new.data?.status === 'posted') notify('Match result posted');
        });
      }
      ch.subscribe();
      document.addEventListener('visibilitychange', reload);
    })();
    return () => { cancelled = true; ch && sb.current?.removeChannel(ch); document.removeEventListener('visibilitychange', reload); };
  }, [loadAll, applyRow, notify]);

  // ---------- who is using this phone ----------
  const me = useMemo(() => (meId ? state.players?.[meId] || null : null), [state.players, meId]);
  const role = me?.role || 'player';
  const unlockedRole = MODE === 'demo' ? role : (unlock && unlock.player === me?.id ? unlock.role : null);
  const isAdmin = role === 'admin' && unlockedRole === 'admin';
  const canCaddie = isAdmin || (role === 'caddie' && unlockedRole === 'caddie');
  const needsPin = MODE === 'live' && (role === 'admin' || role === 'caddie') && !unlockedRole;

  const choosePlayer = useCallback((id) => { setMeId(id); ls.set(ME_KEY, id); }, []);
  const switchPlayer = useCallback(() => { setMeId(null); ls.del(ME_KEY); setUnlock(null); ls.del(PIN_KEY); }, []);

  const unlockWithPin = useCallback(async (pin) => {
    if (MODE === 'demo') return null;
    const { data, error } = await sb.current.rpc('check_pin', { p_pin: pin.trim() });
    if (error) return isNetwork(error) ? 'No signal. Try again when you have service.' : error.message;
    if (!data || data !== role) return 'That PIN doesn’t match.';
    const u = { pin: pin.trim(), role: data, player: me.id };
    setUnlock(u); ls.set(PIN_KEY, u);
    notify(role === 'admin' ? 'Admin tools unlocked' : 'Caddie editing unlocked');
    return null;
  }, [role, me, notify]);

  // ---------- writes ----------
  const pushQueue = useCallback((op) => {
    const q = [...(ls.get(QUEUE_KEY) || []), op];
    ls.set(QUEUE_KEY, q); setQueue(q);
  }, []);

  const send = useCallback(async (op) => {
    const c = sb.current;
    const actor = op.actor || '?';
    if (op.via === 'rpc') {
      return op.kind === 'delete'
        ? c.rpc('admin_delete', { p_pin: op.pin, p_actor: actor, p_table: op.table, p_id: op.id })
        : c.rpc('admin_write', { p_pin: op.pin, p_actor: actor, p_table: op.table, p_id: op.id, p_data: op.data });
    }
    if (op.kind === 'delete') return c.from(op.table).delete().eq('id', op.id);
    if (op.table === 'players') return c.from('players').update({ data: op.data, updated_by: actor }).eq('id', op.id);
    return c.from(op.table).upsert({ id: op.id, data: op.data, updated_by: actor });
  }, []);

  const flush = useCallback(async () => {
    if (MODE !== 'live' || !sb.current) return;
    const pending = ls.get(QUEUE_KEY) || [];
    const left = [];
    for (const op of pending) {
      const res = await send(op);
      if (res.error && isNetwork(res.error)) left.push(op);
      else if (res.error) notify(`A saved change was refused: ${res.error.message}`, 'bad');
    }
    ls.set(QUEUE_KEY, left); setQueue(left);
    if (pending.length && !left.length) notify('Offline changes synced');
  }, [notify, send]);

  useEffect(() => {
    const on = () => { setOnline(true); flush(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    const iv = setInterval(() => { if ((ls.get(QUEUE_KEY) || []).length && navigator.onLine) flush(); }, 20000);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(iv); };
  }, [flush]);

  /** Which route a write takes, or a reason it isn't allowed from this phone. */
  const routeFor = useCallback((table, obj, kind) => {
    if (canCaddie && (isAdmin || table === 'tee_times')) return { via: 'rpc' };
    if (table === 'rsvps' && obj?.player === me?.id) return { via: 'direct' };
    if (table === 'players' && kind !== 'delete' && obj?.id === me?.id) {
      const before = stateRef.current.players?.[obj.id] || {};
      const touched = PROTECTED_PLAYER_FIELDS.filter((f) => JSON.stringify(before[f] ?? null) !== JSON.stringify(obj[f] ?? null));
      if (touched.length) return { error: `Only Marc, Josh or Mike can change ${touched.join(', ')}.` };
      return { via: 'direct' };
    }
    return { error: needsPin ? 'Unlock your admin tools with your PIN first (More → Unlock).' : 'Only Marc, Josh or Mike can change that.' };
  }, [canCaddie, isAdmin, me, needsPin]);

  const recordDemo = useCallback((table, id, before, after) => {
    const entry = { id: Date.now() + Math.random(), at: new Date().toISOString(), actor: me?.initials || '?', table_name: table, row_id: id, before, after };
    setAudit((a) => {
      const n = [entry, ...a].slice(0, 300);
      const st = { ...stateRef.current, [table]: { ...stateRef.current[table] } };
      if (after) st[table][id] = after; else delete st[table][id];
      ls.set(DEMO_KEY, { state: st, audit: n });
      return n;
    });
  }, [me]);

  const save = useCallback(async (table, obj, { quiet } = {}) => {
    const route = routeFor(table, obj, 'upsert');
    if (route.error) { notify(route.error, 'bad'); return false; }
    const before = stateRef.current[table]?.[obj.id] || null;
    applyRow(table, obj.id, obj);
    if (MODE === 'demo') { recordDemo(table, obj.id, before, obj); if (!quiet) notify('Saved'); return true; }
    const op = { kind: 'upsert', via: route.via, table, id: obj.id, data: obj, actor: me?.initials, pin: unlock?.pin };
    const { error } = await send(op);
    if (error && isNetwork(error)) { pushQueue(op); notify('No signal. Saved on this phone and will sync.', 'warn'); return true; }
    if (error) { applyRow(table, obj.id, before); notify(error.message, 'bad'); return false; }
    if (!quiet) notify('Saved');
    return true;
  }, [applyRow, me, notify, routeFor, recordDemo, send, pushQueue, unlock]);

  const remove = useCallback(async (table, id) => {
    const before = stateRef.current[table]?.[id] || null;
    const route = routeFor(table, before, 'delete');
    if (route.error) { notify(route.error, 'bad'); return false; }
    applyRow(table, id, null);
    if (MODE === 'demo') { recordDemo(table, id, before, null); notify('Removed'); return true; }
    const op = { kind: 'delete', via: route.via, table, id, actor: me?.initials, pin: unlock?.pin };
    const { error } = await send(op);
    if (error && isNetwork(error)) { pushQueue(op); notify('No signal. Will sync when back online.', 'warn'); return true; }
    if (error) { applyRow(table, id, before); notify(error.message, 'bad'); return false; }
    notify('Removed'); return true;
  }, [applyRow, me, notify, routeFor, recordDemo, send, pushQueue, unlock]);

  const loadAudit = useCallback(async () => {
    if (MODE === 'demo') return;
    const { data, error } = await sb.current.from('audit_log').select('*').order('id', { ascending: false }).limit(200);
    if (!error) setAudit(data);
  }, []);

  const undo = useCallback(async (entry) => {
    if (entry.before) await save(entry.table_name, entry.before);
    else await remove(entry.table_name, entry.row_id);
  }, [save, remove]);

  const resetDemo = useCallback(() => { ls.del(DEMO_KEY); setState(indexSeed()); setAudit([]); notify('Demo data reset'); }, [notify]);

  const list = useCallback((t) => Object.values(state[t] || {}), [state]);
  const settings = state.settings?.main || seed.settings[0];

  const value = {
    mode: MODE, ready, state, list, settings, me, isAdmin, canCaddie, needsPin, online, queue,
    save, remove, audit, loadAudit, undo, choosePlayer, switchPlayer, unlockWithPin, resetDemo, notify, toast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function isNetwork(err) {
  const m = String(err?.message || err || '').toLowerCase();
  return (typeof navigator !== 'undefined' && !navigator.onLine) || m.includes('failed to fetch') || m.includes('network') || m.includes('load failed');
}

// Fluxos que guardam ou apagam dados (auditoria de 08/11/2026). Banco e nuvem falsos; nenhum dado real.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, overrides = {}) {
  const absolute = path.resolve(file);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name in overrides) return overrides[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
      const target = [base, `${base}.ts`, `${base}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      return load(target, overrides);
    }
    return require(name);
  };
  vm.runInThisContext(`(function(exports, require) { ${code}\n})`, { filename: absolute })(exports, localRequire);
  return exports;
}

// ── Ambiente de navegador mínimo ──
const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
globalThis.window = new EventTarget();
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });

// ── Banco falso com o subconjunto do Dexie usado pelo syncManager ──
function fakeTable(rows = []) {
  const data = new Map(rows.map(r => [r.id, { ...r }]));
  const query = pred => ({
    toArray: async () => [...data.values()].filter(pred).map(r => ({ ...r })),
    count: async () => [...data.values()].filter(pred).length,
    primaryKeys: async () => [...data.values()].filter(pred).map(r => r.id),
    and: extra => query(r => pred(r) && extra(r)),
    modify: async changes => { for (const r of data.values()) if (pred(r)) Object.assign(r, changes); }
  });
  return {
    data,
    where: field => ({ equals: v => query(r => r[field] === v), anyOf: list => query(r => list.includes(r[field])) }),
    delete: async id => { data.delete(id); },
    bulkPut: async list => { for (const r of list) data.set(r.id, { ...r }); }
  };
}
function fakeDb(seed = {}) {
  const db = { transaction: async (...args) => args[args.length - 1]() };
  for (const t of ['patients', 'audiometries', 'settings', 'appointments', 'anamneses']) db[t] = fakeTable(seed[t]);
  return db;
}

// ── Supabase falso: registra chamadas; comportamento configurável por teste ──
function fakeSupabase({ userId = 'user-a', onUpsert, deleteRows = [{ id: 'x' }], stillExists = false } = {}) {
  const calls = [];
  const builder = table => {
    const b = {
      upsert: async records => { calls.push(['upsert', table, records]); if (onUpsert) await onUpsert(records); return { error: null }; },
      delete: () => ({ eq: (_c, id) => ({ select: async () => { calls.push(['delete', table, id]); return { data: deleteRows, error: null }; } }) }),
      select: () => ({ eq: () => ({ limit: async () => ({ data: stillExists ? [{ id: 'x' }] : [], error: null }) }) })
    };
    return b;
  };
  return { calls, client: { auth: { getSession: async () => ({ data: { session: { user: { id: userId } } } }) }, from: builder } };
}

function loadSync(db, supa) {
  return load('src/lib/syncManager.ts', { '@/db/db': { db }, './supabase': { supabase: supa.client, isConfigured: true } });
}

test('sync: registro editado durante o envio continua pendente (não perde a edição)', async () => {
  store.clear();
  const db = fakeDb({ audiometries: [{ id: 'e1', syncStatus: 'pending', updatedAt: 100 }, { id: 'e2', syncStatus: 'pending', updatedAt: 100 }] });
  // Durante o upsert, o profissional edita e1 (novo updatedAt).
  const supa = fakeSupabase({ onUpsert: async () => { Object.assign(db.audiometries.data.get('e1'), { updatedAt: 200 }); } });
  const { syncManager } = loadSync(db, supa);
  await syncManager.sync();
  assert.equal(db.audiometries.data.get('e1').syncStatus, 'pending');
  assert.equal(db.audiometries.data.get('e2').syncStatus, 'synced');
});

test('sync: dados de outra conta no aparelho não são enviados com a sessão atual', async () => {
  store.clear();
  store.set('audiodash_data_owner', 'user-b');
  const db = fakeDb({ patients: [{ id: 'p1', syncStatus: 'pending', updatedAt: 1 }] });
  const supa = fakeSupabase({ userId: 'user-a' });
  const { syncManager } = loadSync(db, supa);
  await syncManager.sync();
  assert.equal(supa.calls.filter(c => c[0] === 'upsert').length, 0);
  assert.equal(db.patients.data.get('p1').syncStatus, 'pending');
  assert.equal(await syncManager.pullFromSupabase('user-a'), false);
});

test('exclusão: recusa silenciosa do RLS (0 linhas, registro ainda existe) fica na fila', async () => {
  store.clear();
  const db = fakeDb({ appointments: [{ id: 'a1', syncStatus: 'synced', updatedAt: 1 }] });
  const supa = fakeSupabase({ deleteRows: [], stillExists: true });
  const { syncManager } = loadSync(db, supa);
  assert.equal(await syncManager.deleteRecord('appointments', 'a1'), 'queued');
  assert.equal(db.appointments.data.has('a1'), false);
  assert.equal(await syncManager.countPending(), 1);
});

test('exclusão: registro que nunca chegou à nuvem sai da fila', async () => {
  store.clear();
  const db = fakeDb({ appointments: [{ id: 'a2', syncStatus: 'pending', updatedAt: 1 }] });
  const supa = fakeSupabase({ deleteRows: [], stillExists: false });
  const { syncManager } = loadSync(db, supa);
  assert.equal(await syncManager.deleteRecord('appointments', 'a2'), 'cloud');
  assert.equal(await syncManager.countPending(), 0);
});

test('exclusão: itens da fila de outra conta não são enviados nem acumulados', async () => {
  store.clear();
  store.set('audiodash_pending_deletions', JSON.stringify([{ table: 'patients', id: 'pb', timestamp: 1, user_id: 'user-b' }]));
  const supa = fakeSupabase({ userId: 'user-a' });
  const { syncManager } = loadSync(fakeDb(), supa);
  await syncManager.syncDeletions();
  assert.equal(supa.calls.filter(c => c[0] === 'delete').length, 0);
  assert.equal(await syncManager.countPending(), 0);
});

test('countPending soma registros pendentes de todas as tabelas e a fila de exclusões', async () => {
  store.clear();
  store.set('audiodash_pending_deletions', JSON.stringify([{ table: 'patients', id: 'z', timestamp: 1 }]));
  const db = fakeDb({ patients: [{ id: 'p', syncStatus: 'pending' }], settings: [{ id: 's', syncStatus: 'pending' }], audiometries: [{ id: 'e', syncStatus: 'synced' }] });
  const { syncManager } = loadSync(db, fakeSupabase());
  assert.equal(await syncManager.countPending(), 3);
});

const status = load('src/lib/settingsStatus.ts');

test('pagamento: link de teste só em desenvolvimento', () => {
  assert.equal(status.resolveCheckoutUrl('https://checkout.dodopayments.com/buy/real', false), 'https://checkout.dodopayments.com/buy/real');
  assert.equal(status.resolveCheckoutUrl(undefined, false), null);
  assert.equal(status.resolveCheckoutUrl('', false), null);
  assert.match(status.resolveCheckoutUrl(undefined, true), /^https:\/\/test\.checkout\.dodopayments\.com\//);
});

test('assinatura offline: falha na leitura usa o último perfil guardado; leitura ok substitui', () => {
  const cached = { subscription_status: 'active', subscription_end_date: '2027-01-01T00:00:00Z', is_admin: false, dodo_customer_id: null };
  const fresh = { ...cached, subscription_status: 'canceled' };
  assert.deepEqual(status.pickProfile(null, true, cached), cached);
  assert.deepEqual(status.pickProfile(fresh, false, cached), fresh);
  assert.equal(status.pickProfile(null, true, null), null);
});

const calendar = load('src/lib/calendarIntegration.ts');

test('calendário externo: só tipo e iniciais; sem nome completo nem observações', () => {
  const appt = { type: 'Audiometria Clínica', patientName: 'maria  da Silva', notes: 'zumbido à esquerda', date: '2026-11-10', time: '09:00' };
  assert.equal(calendar.externalEventTitle(appt), 'Audiometria Clínica — M.D.S.');
  assert.equal(calendar.externalEventTitle({ type: 'Retorno', patientName: '' }), 'Retorno');
  for (const url of [calendar.generateGoogleCalendarURL(appt), calendar.generateOutlookURL(appt)]) {
    const text = decodeURIComponent(url);
    assert.ok(!text.includes('Silva') && !text.includes('zumbido'), url);
  }
});

// Conexão com o banco SQLite.
// No celular usa @capacitor-community/sqlite (arquivo dentro do app, 100% offline).
// No navegador (só para desenvolvimento e prints) usa sql.js guardado no localStorage.
import { Capacitor } from '@capacitor/core';
import { SCHEMA_VERSION, migrate } from './schema.js';

const DB_NAME = 'treinos';
let adapter = null;
let opening = null;

async function openNative() {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  await sqlite.checkConnectionsConsistency().catch(() => {});
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const db = exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await db.open();
  return {
    async all(sql, params = []) {
      const res = await db.query(sql, params);
      return res.values || [];
    },
    async run(sql, params = []) {
      const res = await db.run(sql, params, false);
      return { lastId: res.changes?.lastId, changes: res.changes?.changes };
    },
    async exec(sql) {
      await db.execute(sql, false);
    },
    async begin() {
      await db.execute('BEGIN TRANSACTION;', false);
    },
    async commit() {
      await db.execute('COMMIT;', false);
    },
    async rollback() {
      await db.execute('ROLLBACK;', false).catch(() => {});
    },
  };
}

const STORAGE_KEY = 'treinos-db';

async function openWeb() {
  const initSqlJs = (await import('sql.js')).default;
  const wasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url')).default;
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  const db = saved
    ? new SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0)))
    : new SQL.Database();
  let inTx = false;
  const persist = () => {
    if (inTx) return;
    try {
      const bytes = db.export();
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      localStorage.setItem(STORAGE_KEY, btoa(bin));
    } catch {
      /* sem armazenamento: segue só em memória */
    }
  };
  return {
    async all(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
    async run(sql, params = []) {
      db.run(sql, params);
      const lastId = db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0];
      const changes = db.getRowsModified();
      persist();
      return { lastId, changes };
    },
    async exec(sql) {
      db.exec(sql);
      persist();
    },
    async begin() {
      db.exec('BEGIN TRANSACTION;');
      inTx = true;
    },
    async commit() {
      db.exec('COMMIT;');
      inTx = false;
      persist();
    },
    async rollback() {
      try {
        db.exec('ROLLBACK;');
      } catch {
        /* nada aberto */
      }
      inTx = false;
    },
  };
}

export async function getDb() {
  if (adapter) return adapter;
  if (!opening) {
    opening = (async () => {
      const a = Capacitor.isNativePlatform() ? await openNative() : await openWeb();
      await a.exec('PRAGMA foreign_keys = ON;');
      const row = (await a.all('PRAGMA user_version'))[0];
      const current = Number(row?.user_version ?? 0);
      if (current < SCHEMA_VERSION) {
        await migrate(a, current);
        await a.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
      }
      adapter = a;
      return a;
    })();
  }
  return opening;
}

export async function all(sql, params) {
  return (await getDb()).all(sql, params);
}

export async function one(sql, params) {
  return (await all(sql, params))[0] ?? null;
}

export async function run(sql, params) {
  return (await getDb()).run(sql, params);
}

// Fila simples: garante que uma tarefa só começa quando a anterior terminou.
export function criarTrava() {
  let fim = Promise.resolve();
  return (fn) => {
    const r = fim.then(fn, fn);
    fim = r.catch(() => {});
    return r;
  };
}

const travaTx = criarTrava();

// Executa várias escritas como uma unidade só (uma transação por vez).
export function tx(fn) {
  return travaTx(async () => {
    const db = await getDb();
    await db.begin();
    try {
      const result = await fn();
      await db.commit();
      return result;
    } catch (err) {
      await db.rollback();
      throw err;
    }
  });
}

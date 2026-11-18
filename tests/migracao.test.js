import { test } from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { migrate } from '../src/db/schema.js';

async function banco() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  return {
    raw: db,
    async exec(sql) { db.exec(sql); },
    async run(sql, params = []) {
      db.run(sql, params);
      return { lastId: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
    },
  };
}

test('banco novo já vem com fotos nos 45 exercícios', async () => {
  const db = await banco();
  await migrate(db, 0);
  const [[semFoto]] = db.raw.exec('SELECT COUNT(*) FROM exercicios WHERE imagem_url IS NULL')[0].values;
  assert.equal(semFoto, 0);
});

test('v1 -> v2 coloca foto só onde não havia foto sua', async () => {
  const db = await banco();
  await migrate(db, 0);
  db.raw.run('UPDATE exercicios SET imagem_url = NULL');
  db.raw.run("UPDATE exercicios SET imagem_url = 'minha.jpg' WHERE nome = 'Prancha'");
  await migrate(db, 1);
  const r = db.raw.exec("SELECT imagem_url FROM exercicios WHERE nome IN ('Prancha', 'Stiff') ORDER BY nome")[0].values;
  assert.deepEqual(r, [['minha.jpg'], ['app:exercicios/stiff-legged-barbell-deadlift.jpg']]);
});

test('v2 -> v3 cria dias_academia vazio (o app continua escolhendo sozinho)', async () => {
  const db = await banco();
  await migrate(db, 0);
  const cols = db.raw.exec('PRAGMA table_info(perfil)')[0].values.map((c) => c[1]);
  assert.ok(cols.includes('dias_academia'));
  const [[v]] = db.raw.exec('SELECT dias_academia FROM perfil')[0].values;
  assert.equal(v, null);
});

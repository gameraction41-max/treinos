// Tabelas do app (ver "Modelo de dados" no plano do MVP).
// Para mudar o banco no futuro: aumente SCHEMA_VERSION e adicione um passo em migrate().
import { seed, IMAGENS_PADRAO } from './seed.js';

export const SCHEMA_VERSION = 3;

const V1 = `
CREATE TABLE IF NOT EXISTS perfil (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  altura_cm REAL,
  nivel TEXT NOT NULL DEFAULT 'iniciante',
  meta_semanal INTEGER NOT NULL DEFAULT 4,
  hora_lembrete TEXT NOT NULL DEFAULT '07:00',
  lembrete_peso_dias INTEGER NOT NULL DEFAULT 15,
  configurado INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dias_fixos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  tipo TEXT NOT NULL DEFAULT 'pilates',
  descricao TEXT NOT NULL DEFAULT 'Pilates'
);

CREATE TABLE IF NOT EXISTS exercicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  grupo_muscular TEXT NOT NULL,
  imagem_url TEXT,
  padrao INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modelos_treino (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  nivel TEXT NOT NULL,
  dias_semana TEXT NOT NULL,
  divisao TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modelo_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modelo_id INTEGER NOT NULL REFERENCES modelos_treino(id) ON DELETE CASCADE,
  exercicio_id INTEGER NOT NULL REFERENCES exercicios(id),
  ordem INTEGER NOT NULL,
  series INTEGER NOT NULL,
  repeticoes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fichas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  modelo_origem_id INTEGER REFERENCES modelos_treino(id),
  ordem_fila INTEGER NOT NULL DEFAULT 0,
  ativa INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ficha_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ficha_id INTEGER NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
  exercicio_id INTEGER NOT NULL REFERENCES exercicios(id),
  ordem INTEGER NOT NULL,
  series INTEGER NOT NULL DEFAULT 3,
  repeticoes TEXT NOT NULL DEFAULT '12',
  carga_kg REAL,
  observacao TEXT
);

CREATE TABLE IF NOT EXISTS agenda (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('treino', 'pilates', 'descanso')),
  ficha_id INTEGER REFERENCES fichas(id) ON DELETE SET NULL,
  escolha_manual INTEGER NOT NULL DEFAULT 0,
  feito INTEGER NOT NULL DEFAULT 0,
  feito_em TEXT
);

CREATE TABLE IF NOT EXISTS registros_peso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  peso_kg REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ficha_itens_ficha ON ficha_itens(ficha_id);
CREATE INDEX IF NOT EXISTS idx_modelo_itens_modelo ON modelo_itens(modelo_id);
CREATE INDEX IF NOT EXISTS idx_registros_peso_data ON registros_peso(data);
`;

export async function migrate(db, from) {
  if (from < 1) {
    await db.exec(V1);
    await seed(db); // já vem com as fotos
    await v3(db);
    return;
  }
  if (from < 2) {
    // v2: exercícios padrão ganham foto (só onde você ainda não pôs a sua).
    for (const [nome, url] of Object.entries(IMAGENS_PADRAO)) {
      await db.run('UPDATE exercicios SET imagem_url = ? WHERE padrao = 1 AND nome = ? AND imagem_url IS NULL', [url, nome]);
    }
  }
  if (from < 3) await v3(db);
}

// v3: dias da semana em que você vai à academia ('1,3,5'; nulo = o app escolhe),
// data de início dos treinos e uma mudança de dias agendada (a partir de uma data).
async function v3(db) {
  for (const col of ['dias_academia', 'data_inicio', 'mudanca_em', 'mudanca_dias']) {
    try {
      await db.exec(`ALTER TABLE perfil ADD COLUMN ${col} TEXT`);
    } catch (e) {
      if (!/duplicate column/i.test(String(e?.message ?? e))) throw e;
    }
  }
}

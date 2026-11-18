// Todas as leituras e escritas do app passam por aqui.
import { all, one, run, tx, criarTrava, getDb } from './connection.js';
import { seed } from './seed.js';

// Montar e replanejar semanas nunca acontecem ao mesmo tempo.
const travaSemana = criarTrava();
import { today, weekDays, weekday, addDays } from '../lib/dates.js';
import { escolherDiasAcademia, distribuirFila } from '../lib/planner.js';

// ---------- Perfil e configurações ----------

export async function getPerfil() {
  return one('SELECT * FROM perfil WHERE id = 1');
}

export async function savePerfil(campos) {
  const permitidos = ['altura_cm', 'nivel', 'meta_semanal', 'hora_lembrete', 'lembrete_peso_dias', 'configurado'];
  const keys = Object.keys(campos).filter((k) => permitidos.includes(k));
  if (!keys.length) return;
  await run(
    `UPDATE perfil SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = 1`,
    keys.map((k) => campos[k]),
  );
}

export async function getDiasFixos() {
  return all('SELECT * FROM dias_fixos ORDER BY dia_semana');
}

export async function addDiaFixo(dia_semana, descricao) {
  await run("INSERT INTO dias_fixos (dia_semana, tipo, descricao) VALUES (?, 'pilates', ?)", [dia_semana, descricao || 'Atividade fixa']);
}

export async function removeDiaFixo(id) {
  await run('DELETE FROM dias_fixos WHERE id = ?', [id]);
}

// ---------- Exercícios ----------

export async function listExercicios({ busca = '', grupo = '' } = {}) {
  const where = [];
  const params = [];
  if (grupo) {
    where.push('grupo_muscular = ?');
    params.push(grupo);
  }
  const rows = await all(
    `SELECT * FROM exercicios ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY nome COLLATE NOCASE`,
    params,
  );
  const q = normalizar(busca.trim());
  return q ? rows.filter((r) => normalizar(r.nome).includes(q)) : rows;
}

function normalizar(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export async function getExercicio(id) {
  return one('SELECT * FROM exercicios WHERE id = ?', [id]);
}

export async function saveExercicio({ id, nome, grupo_muscular, imagem_url }) {
  if (id) {
    await run('UPDATE exercicios SET nome = ?, grupo_muscular = ?, imagem_url = ? WHERE id = ?', [
      nome,
      grupo_muscular,
      imagem_url ?? null,
      id,
    ]);
    return id;
  }
  const { lastId } = await run(
    'INSERT INTO exercicios (nome, grupo_muscular, imagem_url, padrao) VALUES (?, ?, ?, 0)',
    [nome, grupo_muscular, imagem_url ?? null],
  );
  return lastId;
}

export async function setImagemExercicio(id, imagem_url) {
  await run('UPDATE exercicios SET imagem_url = ? WHERE id = ?', [imagem_url ?? null, id]);
}

// Só exercícios cadastrados por você e que não estão em nenhuma ficha.
export async function podeExcluirExercicio(id) {
  const ex = await getExercicio(id);
  if (!ex || ex.padrao) return false;
  const uso = await one('SELECT COUNT(*) AS n FROM ficha_itens WHERE exercicio_id = ?', [id]);
  return Number(uso.n) === 0;
}

export async function deleteExercicio(id) {
  if (!(await podeExcluirExercicio(id))) return false;
  await run('DELETE FROM exercicios WHERE id = ?', [id]);
  return true;
}

// ---------- Modelos sugeridos ----------

export async function listDivisoes() {
  const modelos = await all(
    `SELECT m.*, (SELECT COUNT(*) FROM modelo_itens i WHERE i.modelo_id = m.id) AS n_itens
     FROM modelos_treino m ORDER BY m.ordem`,
  );
  const map = new Map();
  for (const m of modelos) {
    if (!map.has(m.divisao)) {
      map.set(m.divisao, { divisao: m.divisao, nivel: m.nivel, dias_semana: m.dias_semana, fichas: [] });
    }
    map.get(m.divisao).fichas.push(m);
  }
  return [...map.values()];
}

export async function getModeloItens(modeloId) {
  return all(
    `SELECT i.*, e.nome, e.grupo_muscular, e.imagem_url FROM modelo_itens i
     JOIN exercicios e ON e.id = i.exercicio_id WHERE i.modelo_id = ? ORDER BY i.ordem`,
    [modeloId],
  );
}

// ---------- Fichas ----------

export async function listFichas() {
  return all(
    `SELECT f.*, (SELECT COUNT(*) FROM ficha_itens i WHERE i.ficha_id = f.id) AS n_itens
     FROM fichas f ORDER BY f.ativa DESC, f.ordem_fila, f.id`,
  );
}

export async function listFichasAtivas() {
  return all('SELECT * FROM fichas WHERE ativa = 1 ORDER BY ordem_fila, id');
}

export async function getFicha(id) {
  const ficha = await one('SELECT * FROM fichas WHERE id = ?', [id]);
  if (!ficha) return null;
  ficha.itens = await all(
    `SELECT i.*, e.nome, e.grupo_muscular, e.imagem_url FROM ficha_itens i
     JOIN exercicios e ON e.id = i.exercicio_id WHERE i.ficha_id = ? ORDER BY i.ordem, i.id`,
    [id],
  );
  return ficha;
}

async function proximaOrdemFila() {
  const r = await one('SELECT COALESCE(MAX(ordem_fila), -1) + 1 AS n FROM fichas');
  return Number(r.n);
}

export async function criarFicha(nome) {
  const { lastId } = await run('INSERT INTO fichas (nome, ordem_fila, ativa) VALUES (?, ?, 1)', [
    nome,
    await proximaOrdemFila(),
  ]);
  await reorganizarFila();
  return lastId;
}

async function copiarItensDoModelo(fichaId, modeloId) {
  const itens = await all('SELECT * FROM modelo_itens WHERE modelo_id = ? ORDER BY ordem', [modeloId]);
  for (const it of itens) {
    await run(
      'INSERT INTO ficha_itens (ficha_id, exercicio_id, ordem, series, repeticoes) VALUES (?, ?, ?, ?, ?)',
      [fichaId, it.exercicio_id, it.ordem, it.series, it.repeticoes],
    );
  }
}

// Copia todas as fichas de uma divisão sugerida para as suas fichas.
export async function usarSugestao(divisao) {
  const modelos = await all('SELECT * FROM modelos_treino WHERE divisao = ? ORDER BY ordem', [divisao]);
  const ids = await tx(async () => {
    let ordem = await proximaOrdemFila();
    const out = [];
    for (const m of modelos) {
      const { lastId } = await run(
        'INSERT INTO fichas (nome, modelo_origem_id, ordem_fila, ativa) VALUES (?, ?, ?, 1)',
        [m.nome, m.id, ordem++],
      );
      await copiarItensDoModelo(lastId, m.id);
      out.push(lastId);
    }
    return out;
  });
  await reorganizarFila();
  return ids;
}

// Volta a ficha para os exercícios do modelo de onde ela veio.
export async function restaurarSugestao(fichaId) {
  const f = await one('SELECT * FROM fichas WHERE id = ?', [fichaId]);
  if (!f?.modelo_origem_id) return;
  const m = await one('SELECT * FROM modelos_treino WHERE id = ?', [f.modelo_origem_id]);
  await tx(async () => {
    await run('DELETE FROM ficha_itens WHERE ficha_id = ?', [fichaId]);
    await copiarItensDoModelo(fichaId, f.modelo_origem_id);
    if (m) await run('UPDATE fichas SET nome = ? WHERE id = ?', [m.nome, fichaId]);
  });
}

export async function renomearFicha(id, nome) {
  await run('UPDATE fichas SET nome = ? WHERE id = ?', [nome, id]);
}

export async function setFichaAtiva(id, ativa) {
  await run('UPDATE fichas SET ativa = ? WHERE id = ?', [ativa ? 1 : 0, id]);
  await reorganizarFila();
}

export async function excluirFicha(id) {
  await run('DELETE FROM fichas WHERE id = ?', [id]);
  await reorganizarFila();
}

// Renumera a fila (0, 1, 2…) das fichas ativas, mantendo a ordem atual.
async function reorganizarFila() {
  const fichas = await all('SELECT id FROM fichas ORDER BY ativa DESC, ordem_fila, id');
  for (let i = 0; i < fichas.length; i++) {
    await run('UPDATE fichas SET ordem_fila = ? WHERE id = ?', [i, fichas[i].id]);
  }
}

export async function moverFicha(id, delta) {
  const fichas = await listFichasAtivas();
  const i = fichas.findIndex((f) => f.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= fichas.length) return;
  await tx(async () => {
    await run('UPDATE fichas SET ordem_fila = ? WHERE id = ?', [fichas[j].ordem_fila, fichas[i].id]);
    await run('UPDATE fichas SET ordem_fila = ? WHERE id = ?', [fichas[i].ordem_fila, fichas[j].id]);
  });
}

export async function addItem(fichaId, exercicioId) {
  const r = await one('SELECT COALESCE(MAX(ordem), -1) + 1 AS n FROM ficha_itens WHERE ficha_id = ?', [fichaId]);
  await run('INSERT INTO ficha_itens (ficha_id, exercicio_id, ordem, series, repeticoes) VALUES (?, ?, ?, 3, ?)', [
    fichaId,
    exercicioId,
    Number(r.n),
    '12',
  ]);
}

export async function updateItem(id, { series, repeticoes, carga_kg, observacao }) {
  await run('UPDATE ficha_itens SET series = ?, repeticoes = ?, carga_kg = ?, observacao = ? WHERE id = ?', [
    series,
    repeticoes,
    carga_kg ?? null,
    observacao || null,
    id,
  ]);
}

export async function removeItem(id) {
  await run('DELETE FROM ficha_itens WHERE id = ?', [id]);
}

export async function moverItem(fichaId, itemId, delta) {
  const itens = await all('SELECT id FROM ficha_itens WHERE ficha_id = ? ORDER BY ordem, id', [fichaId]);
  const i = itens.findIndex((x) => x.id === itemId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= itens.length) return;
  [itens[i], itens[j]] = [itens[j], itens[i]];
  await tx(async () => {
    for (let k = 0; k < itens.length; k++) {
      await run('UPDATE ficha_itens SET ordem = ? WHERE id = ?', [k, itens[k].id]);
    }
  });
}

// ---------- Agenda da semana ----------

export async function getSemana(inicio) {
  const dias = weekDays(inicio);
  const rows = await all(
    `SELECT a.*, f.nome AS ficha_nome FROM agenda a LEFT JOIN fichas f ON f.id = a.ficha_id
     WHERE a.data BETWEEN ? AND ? ORDER BY a.data`,
    [dias[0], dias[6]],
  );
  const byDate = Object.fromEntries(rows.map((r) => [r.data, r]));
  return dias.map((d) => byDate[d] ?? { data: d, tipo: 'descanso', ficha_id: null, feito: 0, vazio: true });
}

// Monta a semana na primeira vez que ela é aberta: dias fixos, dias de academia
// espalhados e a fila de fichas. Semanas que já passaram não são montadas.
export function garantirSemana(inicio) {
  return travaSemana(() => garantirSemanaAgora(inicio));
}

async function garantirSemanaAgora(inicio) {
  const dias = weekDays(inicio);
  const hoje = today();
  if (dias[6] < hoje) return false;
  const existe = await one('SELECT COUNT(*) AS n FROM agenda WHERE data BETWEEN ? AND ?', [dias[0], dias[6]]);
  if (Number(existe.n) > 0) return false;
  await montarSemana(inicio);
  return true;
}

// Replaneja do zero (a partir de hoje), mantendo o que já foi feito.
export function replanejarSemana(inicio) {
  return travaSemana(() => replanejarAgora(inicio));
}

async function replanejarAgora(inicio) {
  const dias = weekDays(inicio);
  const hoje = today();
  await run('DELETE FROM agenda WHERE data BETWEEN ? AND ? AND data >= ? AND feito = 0', [dias[0], dias[6], hoje]);
  await montarSemana(inicio);
}

async function montarSemana(inicio) {
  const dias = weekDays(inicio);
  const hoje = today();
  const perfil = await getPerfil();
  const fixos = await getDiasFixos();
  const fixosPorDia = new Set(fixos.map((f) => f.dia_semana));
  const existentes = new Set(
    (await all('SELECT data FROM agenda WHERE data BETWEEN ? AND ?', [dias[0], dias[6]])).map((r) => r.data),
  );
  const feitosNaSemana = Number(
    (
      await one("SELECT COUNT(*) AS n FROM agenda WHERE data BETWEEN ? AND ? AND feito = 1 AND tipo != 'descanso'", [
        dias[0],
        dias[6],
      ])
    ).n,
  );

  const futuros = dias.filter((d) => d >= hoje && !existentes.has(d));
  const fixosFuturos = futuros.filter((d) => fixosPorDia.has(weekday(d)));
  const livres = futuros.filter((d) => !fixosPorDia.has(weekday(d)));
  const n = Math.max(0, Number(perfil.meta_semanal) - fixosFuturos.length - feitosNaSemana);
  const academia = new Set(escolherDiasAcademia(livres, n, weekday));

  await tx(async () => {
    for (const d of dias) {
      if (existentes.has(d)) continue;
      let tipo = 'descanso';
      if (d >= hoje) {
        if (fixosPorDia.has(weekday(d))) tipo = 'pilates';
        else if (academia.has(d)) tipo = 'treino';
      }
      await run('INSERT INTO agenda (data, tipo) VALUES (?, ?)', [d, tipo]);
    }
  });
  await redistribuirFila();
}

async function ultimaFichaFeita() {
  const r = await one(
    "SELECT ficha_id FROM agenda WHERE feito = 1 AND ficha_id IS NOT NULL AND tipo = 'treino' ORDER BY feito_em DESC, data DESC LIMIT 1",
  );
  return r?.ficha_id ?? null;
}

export async function proximaFichaDaFila() {
  const fichas = await listFichasAtivas();
  if (!fichas.length) return null;
  const ultima = await ultimaFichaFeita();
  const i = fichas.findIndex((f) => f.id === ultima);
  return fichas[(i + 1) % fichas.length];
}

// Reaplica a fila (A → B → C…) nos treinos de hoje em diante que ainda não foram feitos.
export async function redistribuirFila() {
  const fichas = await listFichasAtivas();
  const ultima = await ultimaFichaFeita();
  const dias = await all(
    "SELECT data, ficha_id, escolha_manual FROM agenda WHERE tipo = 'treino' AND feito = 0 AND data >= ? ORDER BY data",
    [today()],
  );
  const novos = distribuirFila(dias, fichas, ultima);
  await tx(async () => {
    for (const d of novos) {
      await run('UPDATE agenda SET ficha_id = ? WHERE data = ?', [d.ficha_id, d.data]);
    }
  });
}

// tipo: 'treino' | 'pilates' | 'descanso'. fichaId null = "próxima da fila".
export async function definirDia(data, tipo, fichaId = null) {
  const manual = tipo === 'treino' && fichaId ? 1 : 0;
  await run(
    `INSERT INTO agenda (data, tipo, ficha_id, escolha_manual) VALUES (?, ?, ?, ?)
     ON CONFLICT(data) DO UPDATE SET tipo = excluded.tipo, ficha_id = excluded.ficha_id,
       escolha_manual = excluded.escolha_manual`,
    [data, tipo, tipo === 'treino' ? fichaId : null, manual],
  );
  await redistribuirFila();
}

export async function marcarFeito(data, feito) {
  await run('UPDATE agenda SET feito = ?, feito_em = ? WHERE data = ?', [
    feito ? 1 : 0,
    feito ? new Date().toISOString() : null,
    data,
  ]);
  await redistribuirFila();
}

// Primeiro dia de descanso de hoje até o fim da semana.
export async function proximoDiaLivre(inicio) {
  const fim = addDays(inicio, 6);
  const r = await one(
    "SELECT data FROM agenda WHERE tipo = 'descanso' AND data >= ? AND data <= ? ORDER BY data LIMIT 1",
    [today(), fim],
  );
  return r?.data ?? null;
}

export async function agendaFutura(dias = 14) {
  return all(
    `SELECT a.*, f.nome AS ficha_nome FROM agenda a LEFT JOIN fichas f ON f.id = a.ficha_id
     WHERE a.data BETWEEN ? AND ? ORDER BY a.data`,
    [today(), addDays(today(), dias)],
  );
}

// ---------- Peso ----------

export async function listPeso() {
  return all('SELECT * FROM registros_peso ORDER BY data, id');
}

export async function addPeso(data, peso_kg) {
  await run('INSERT INTO registros_peso (data, peso_kg) VALUES (?, ?)', [data, peso_kg]);
}

export async function deletePeso(id) {
  await run('DELETE FROM registros_peso WHERE id = ?', [id]);
}

export async function ultimoPeso() {
  return one('SELECT * FROM registros_peso ORDER BY data DESC, id DESC LIMIT 1');
}

// ---------- Recomeçar do zero ----------

// Apaga todos os seus dados (fichas, semana, peso, exercícios cadastrados e
// configurações) e volta o app ao estado da primeira abertura.
export async function apagarTudo() {
  const fotos = (await all('SELECT imagem_url FROM exercicios WHERE imagem_url IS NOT NULL')).map((r) => r.imagem_url);
  const db = await getDb();
  await tx(async () => {
    for (const t of ['agenda', 'ficha_itens', 'fichas', 'registros_peso', 'dias_fixos', 'modelo_itens', 'modelos_treino', 'exercicios', 'perfil']) {
      await run(`DELETE FROM ${t}`);
    }
    await run("DELETE FROM sqlite_sequence");
    await seed(db);
  });
  return fotos;
}

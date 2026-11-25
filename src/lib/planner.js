// Regras puras de planejamento (sem banco), para poder testar.

// Dias de academia da semana.
// livres: lista de datas 'AAAA-MM-DD' em ordem; weekdayOf: data -> 0..6 (0 = domingo).
// preferidos: dias da semana que você escolheu (0..6). Sem escolha, o app espalha
// os n dias entre os livres, preferindo segunda a sexta.
export function escolherDiasAcademia(livres, n, weekdayOf, preferidos = null) {
  if (n <= 0) return [];
  if (preferidos) {
    const set = new Set(preferidos);
    return livres.filter((d) => set.has(weekdayOf(d))).slice(0, n);
  }
  const uteis = livres.filter((d) => {
    const w = weekdayOf(d);
    return w >= 1 && w <= 5;
  });
  const pool = n <= uteis.length ? uteis : livres;
  if (n >= pool.length) return [...pool];
  const out = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor((i * pool.length) / n + pool.length / (2 * n));
    out.push(pool[Math.min(idx, pool.length - 1)]);
  }
  return [...new Set(out)];
}

// '1,3,5' -> [1, 3, 5]; '' -> [] (só atividade fixa); nulo -> null (o app escolhe sozinho).
export function lerDias(texto) {
  if (texto == null) return null;
  if (texto === '') return [];
  return String(texto)
    .split(',')
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

// Ordem de exibição: segunda a domingo.
export const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export function ordenarDias(dias) {
  return [...new Set(dias)].sort((a, b) => ORDEM_SEMANA.indexOf(a) - ORDEM_SEMANA.indexOf(b));
}

// Os dias que o app usaria sozinho para uma meta, sem contar os dias fixos.
export function diasAcademiaPadrao(meta, diasFixos) {
  const fixos = new Set(diasFixos);
  const livres = ORDEM_SEMANA.filter((d) => !fixos.has(d));
  return ordenarDias(escolherDiasAcademia(livres, meta - fixos.size, (d) => d));
}

// Próxima ficha da fila depois da última feita. Fichas já em ordem_fila.
export function proximaDaFila(fichas, ultimaFeitaId) {
  if (!fichas.length) return null;
  const i = fichas.findIndex((f) => f.id === ultimaFeitaId);
  return fichas[(i + 1) % fichas.length];
}

// Distribui a fila pelos dias de treino ainda não feitos, a partir da próxima.
// dias: [{data, ficha_id, escolha_manual}] em ordem. Os escolhidos à mão ficam como estão.
// Retorna [{data, ficha_id}] para os dias automáticos.
export function distribuirFila(dias, fichas, ultimaFeitaId) {
  if (!fichas.length) return dias.filter((d) => !d.escolha_manual).map((d) => ({ data: d.data, ficha_id: null }));
  let atual = proximaDaFila(fichas, ultimaFeitaId);
  const out = [];
  for (const d of dias) {
    if (d.escolha_manual) {
      // Um dia escolhido à mão "consome" aquela ficha: a fila segue dela.
      const f = fichas.find((x) => x.id === d.ficha_id);
      if (f) atual = proximaDaFila(fichas, f.id);
      continue;
    }
    out.push({ data: d.data, ficha_id: atual.id });
    atual = proximaDaFila(fichas, atual.id);
  }
  return out;
}

const NIVEL_ORDEM = { iniciante: 0, intermediario: 1, avancado: 2 };

function faixa(dias) {
  const [a, b] = String(dias).split('-').map(Number);
  return [a, b ?? a];
}

// Escolhe a divisão sugerida para o nível, os dias de academia e o objetivo.
// divisoes: [{divisao, nivel, dias_semana}] (uma por divisão).
// Para emagrecer ou saúde, com até 3 dias, corpo inteiro rende mais que dividir por grupo.
export function divisaoSugerida(divisoes, nivel, diasAcademia, objetivo = null) {
  if (!divisoes.length) return null;
  if ((objetivo === 'emagrecer' || objetivo === 'saude') && diasAcademia <= 3) {
    const fb = divisoes.find((d) => /full body|corpo inteiro/i.test(d.divisao));
    if (fb) return fb;
  }
  const doNivel = divisoes.filter((d) => d.nivel === nivel);
  const candidatas = doNivel.length ? doNivel : divisoes;
  const dist = (d) => {
    const [a, b] = faixa(d.dias_semana);
    const dd = diasAcademia < a ? a - diasAcademia : diasAcademia > b ? diasAcademia - b : 0;
    return dd * 10 + Math.abs((NIVEL_ORDEM[d.nivel] ?? 0) - (NIVEL_ORDEM[nivel] ?? 0)) * 100;
  };
  return [...candidatas].sort((x, y) => dist(x) - dist(y))[0];
}

export function imc(pesoKg, alturaCm) {
  if (!pesoKg || !alturaCm) return null;
  const m = alturaCm / 100;
  return pesoKg / (m * m);
}

export function classificarImc(v) {
  if (v == null) return '';
  if (v < 18.5) return 'Abaixo do peso';
  if (v < 25) return 'Peso normal';
  if (v < 30) return 'Sobrepeso';
  if (v < 35) return 'Obesidade grau I';
  if (v < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

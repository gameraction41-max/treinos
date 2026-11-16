// Regras puras de planejamento (sem banco), para poder testar.

// Espalha n dias de academia entre os dias livres, preferindo segunda a sexta.
// livres: lista de datas 'AAAA-MM-DD' em ordem; weekdayOf: data -> 0..6 (0 = domingo).
export function escolherDiasAcademia(livres, n, weekdayOf) {
  if (n <= 0) return [];
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

// Escolhe a divisão sugerida para o nível e os dias de academia.
// divisoes: [{divisao, nivel, dias_semana}] (uma por divisão).
export function divisaoSugerida(divisoes, nivel, diasAcademia) {
  if (!divisoes.length) return null;
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

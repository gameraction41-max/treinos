// Objetivos do treino e como cada um ajusta as fichas sugeridas (sem banco, para testar).

export const OBJETIVOS = [
  {
    value: 'emagrecer',
    label: 'Emagrecer',
    desc: 'Perder gordura com treinos mais dinâmicos e cardio no fim.',
    ajuste: '3 × 15 e 20 min de cardio no fim de cada treino',
  },
  {
    value: 'hipertrofia',
    label: 'Ganhar massa muscular',
    desc: 'Mais volume nos exercícios principais para os músculos crescerem.',
    ajuste: '4 séries nos principais, 8 a 12 repetições',
  },
  {
    value: 'forca',
    label: 'Ganhar força',
    desc: 'Menos repetições e mais carga nos exercícios principais.',
    ajuste: '5 × 5 nos dois primeiros exercícios, 3 × 8-10 nos outros',
  },
  {
    value: 'saude',
    label: 'Saúde e disposição',
    desc: 'Treinar com regularidade, sem um foco específico.',
    ajuste: 'Volume moderado, como no modelo',
  },
];

export function nomeObjetivo(v) {
  return OBJETIVOS.find((o) => o.value === v)?.label ?? '';
}

const porTempo = (reps) => /\d\s*(s|min)\b/i.test(String(reps));

// itens: [{exercicio_id, series, repeticoes, grupo_muscular, ...}] na ordem da ficha.
// cardio: exercício de cardio ({id, nome, grupo_muscular, imagem_url}) para emagrecer.
export function ajustarItens(itens, objetivo, cardio = null) {
  const principal = (it, i) => i < 2 && it.grupo_muscular !== 'Abdômen';
  const out = itens.map((it, i) => {
    if (porTempo(it.repeticoes) || it.grupo_muscular === 'Cardio') return { ...it };
    if (objetivo === 'emagrecer') return { ...it, series: 3, repeticoes: '15' };
    if (objetivo === 'hipertrofia') {
      if (it.grupo_muscular === 'Abdômen') return { ...it };
      return { ...it, series: principal(it, i) ? 4 : 3, repeticoes: '8-12' };
    }
    if (objetivo === 'forca') {
      if (it.grupo_muscular === 'Abdômen') return { ...it };
      return principal(it, i) ? { ...it, series: 5, repeticoes: '5' } : { ...it, series: 3, repeticoes: '8-10' };
    }
    return { ...it };
  });
  if (objetivo === 'emagrecer' && cardio && !out.some((it) => it.grupo_muscular === 'Cardio')) {
    out.push({
      exercicio_id: cardio.id,
      nome: cardio.nome,
      grupo_muscular: cardio.grupo_muscular,
      imagem_url: cardio.imagem_url,
      series: 1,
      repeticoes: '20 min',
      ordem: out.length,
    });
  }
  return out;
}

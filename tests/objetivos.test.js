import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajustarItens } from '../src/lib/objetivos.js';
import { divisaoSugerida } from '../src/lib/planner.js';

const itens = [
  { exercicio_id: 1, grupo_muscular: 'Quadríceps', series: 3, repeticoes: '12' },
  { exercicio_id: 2, grupo_muscular: 'Peito', series: 3, repeticoes: '12' },
  { exercicio_id: 3, grupo_muscular: 'Costas', series: 3, repeticoes: '12' },
  { exercicio_id: 4, grupo_muscular: 'Abdômen', series: 3, repeticoes: '30 s' },
];
const cardio = { id: 99, nome: 'Esteira', grupo_muscular: 'Cardio', imagem_url: null };
const resumo = (xs) => xs.map((x) => `${x.exercicio_id}:${x.series}x${x.repeticoes}`).join(' ');

test('emagrecer: 3 × 15 e cardio no fim; prancha continua por tempo', () => {
  assert.equal(resumo(ajustarItens(itens, 'emagrecer', cardio)), '1:3x15 2:3x15 3:3x15 4:3x30 s 99:1x20 min');
});

test('hipertrofia e força mudam só os exercícios de carga', () => {
  assert.equal(resumo(ajustarItens(itens, 'hipertrofia')), '1:4x8-12 2:4x8-12 3:3x8-12 4:3x30 s');
  assert.equal(resumo(ajustarItens(itens, 'forca')), '1:5x5 2:5x5 3:3x8-10 4:3x30 s');
});

test('saúde e sem objetivo mantêm o modelo', () => {
  assert.equal(resumo(ajustarItens(itens, 'saude', cardio)), resumo(itens));
  assert.equal(resumo(ajustarItens(itens, null, cardio)), resumo(itens));
});

test('emagrecer com até 3 dias prefere corpo inteiro', () => {
  const dvs = [
    { divisao: 'Full body A/B', nivel: 'iniciante', dias_semana: '2-3' },
    { divisao: 'A/B superiores e inferiores', nivel: 'intermediario', dias_semana: '3-4' },
  ];
  assert.equal(divisaoSugerida(dvs, 'intermediario', 3, 'emagrecer').divisao, 'Full body A/B');
  assert.equal(divisaoSugerida(dvs, 'intermediario', 3, 'hipertrofia').divisao, 'A/B superiores e inferiores');
  assert.equal(divisaoSugerida(dvs, 'intermediario', 4, 'emagrecer').divisao, 'A/B superiores e inferiores');
});

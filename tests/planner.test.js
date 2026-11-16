import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escolherDiasAcademia, distribuirFila, proximaDaFila, divisaoSugerida, imc, classificarImc } from '../src/lib/planner.js';
import { weekStart, weekDays, weekday } from '../src/lib/dates.js';

const semana = weekDays('2026-11-16'); // segunda a domingo

test('semana começa na segunda', () => {
  assert.equal(weekStart('2026-11-22'), '2026-11-16');
  assert.equal(weekStart('2026-11-16'), '2026-11-16');
  assert.equal(weekStart('2026-11-19'), '2026-11-16');
});

test('espalha 3 treinos em seg, qua e sex', () => {
  const livres = semana.filter((d) => weekday(d) !== 6);
  assert.deepEqual(escolherDiasAcademia(livres, 3, weekday), ['2026-11-16', '2026-11-18', '2026-11-20']);
});

test('usa o domingo só quando faltam dias úteis', () => {
  const livres = semana.filter((d) => weekday(d) !== 6);
  assert.equal(escolherDiasAcademia(livres, 6, weekday).length, 6);
  assert.ok(!escolherDiasAcademia(livres, 5, weekday).includes('2026-11-22'));
});

test('zero treinos não escolhe nada', () => {
  assert.deepEqual(escolherDiasAcademia(semana, 0, weekday), []);
});

const fichas = [{ id: 1 }, { id: 2 }, { id: 3 }];

test('fila gira A → B → C → A', () => {
  assert.equal(proximaDaFila(fichas, null).id, 1);
  assert.equal(proximaDaFila(fichas, 1).id, 2);
  assert.equal(proximaDaFila(fichas, 3).id, 1);
});

test('distribui a fila a partir da última feita', () => {
  const dias = [{ data: 'a' }, { data: 'b' }, { data: 'c' }];
  assert.deepEqual(
    distribuirFila(dias, fichas, 2).map((d) => d.ficha_id),
    [3, 1, 2],
  );
});

test('dia escolhido à mão fica e a fila segue dele', () => {
  const dias = [{ data: 'a' }, { data: 'b', escolha_manual: 1, ficha_id: 1 }, { data: 'c' }];
  const r = distribuirFila(dias, fichas, null);
  assert.deepEqual(r, [
    { data: 'a', ficha_id: 1 },
    { data: 'c', ficha_id: 2 },
  ]);
});

test('sugestão por nível e dias', () => {
  const dv = [
    { divisao: 'FB', nivel: 'iniciante', dias_semana: '2-3' },
    { divisao: 'AB', nivel: 'intermediario', dias_semana: '3-4' },
    { divisao: 'ABC', nivel: 'avancado', dias_semana: '4' },
    { divisao: 'ABCD', nivel: 'avancado', dias_semana: '5' },
  ];
  assert.equal(divisaoSugerida(dv, 'iniciante', 3).divisao, 'FB');
  assert.equal(divisaoSugerida(dv, 'intermediario', 2).divisao, 'AB');
  assert.equal(divisaoSugerida(dv, 'avancado', 4).divisao, 'ABC');
  assert.equal(divisaoSugerida(dv, 'avancado', 5).divisao, 'ABCD');
});

test('IMC', () => {
  assert.equal(imc(80, 180).toFixed(1), '24.7');
  assert.equal(classificarImc(24.7), 'Peso normal');
  assert.equal(classificarImc(27), 'Sobrepeso');
  assert.equal(imc(80, null), null);
});

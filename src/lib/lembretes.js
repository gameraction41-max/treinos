// Lembretes: notificações locais agendadas no próprio celular, sem servidor.
// Sempre que a semana, a fila ou as configurações mudam, tudo é cancelado e reagendado.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications as LN } from '@capacitor/local-notifications';
import * as repo from '../db/repo.js';
import { today, addDays, parse, weekStart, weekDays } from './dates.js';

const CANAL = 'lembretes';
const ID_TREINO = 1000;
const ID_META = 2000;
const ID_PESO = 3000;

const nativo = () => Capacitor.isNativePlatform();

// Atenção: nunca devolva um plugin do Capacitor de uma função async (nem com await).
// O plugin é um Proxy que responde a qualquer propriedade, inclusive "then", e a
// Promise fica esperando para sempre. Foi isso que travou o build 1 em "Carregando…".

export async function permissaoNotificacoes() {
  if (!nativo()) return 'granted';
  return (await LN.checkPermissions()).display;
}

export async function pedirPermissao() {
  if (!nativo()) return 'granted';
  let st = (await LN.checkPermissions()).display;
  if (st !== 'granted') st = (await LN.requestPermissions()).display;
  return st;
}

function quando(data, hora) {
  const [h, m] = hora.split(':').map(Number);
  const d = parse(data);
  d.setHours(h, m, 0, 0);
  return d;
}

function nomeCurto(nome) {
  return nome || 'Treino';
}

// Calcula a lista de notificações a partir do banco (também usada nos testes do navegador).
export async function montarLembretes(agora = new Date()) {
  const perfil = await repo.getPerfil();
  const hora = perfil.hora_lembrete || '07:00';
  const fixos = await repo.getDiasFixos();
  const out = [];

  // 1. Treino do dia (próximas duas semanas)
  const agenda = await repo.agendaFutura(13);
  agenda.forEach((d, i) => {
    if (d.feito || d.tipo === 'descanso') return;
    const at = quando(d.data, hora);
    if (at <= agora) return;
    const fixo = fixos.find((f) => f.dia_semana === parse(d.data).getDay());
    const titulo =
      d.tipo === 'pilates' ? `Hoje: ${fixo?.descricao || 'Atividade fixa'}` : `Hoje: ${nomeCurto(d.ficha_nome)}`;
    out.push({ id: ID_TREINO + i, title: titulo, body: 'Bom treino! Marque como feito quando terminar.', at });
  });

  // 2. Meta da semana: quinta-feira, se faltar mais de um treino
  for (const semana of [weekStart(today()), addDays(weekStart(today()), 7)]) {
    const dias = await repo.getSemana(semana);
    const feitos = dias.filter((d) => d.feito && d.tipo !== 'descanso').length;
    const faltam = Number(perfil.meta_semanal) - feitos;
    const quinta = weekDays(semana)[3];
    const at = quando(quinta, hora);
    if (faltam > 1 && at > agora) {
      out.push({
        id: ID_META + (semana === weekStart(today()) ? 0 : 1),
        title: `Faltam ${faltam} treinos para fechar a semana`,
        body: 'Dá uma olhada na sua semana e encaixe os próximos.',
        at,
      });
    }
  }

  // 3. Atualizar peso a cada 15 ou 30 dias
  const ultimo = await repo.ultimoPeso();
  let alvo = addDays(ultimo?.data ?? today(), Number(perfil.lembrete_peso_dias) || 15);
  let at = quando(alvo, hora);
  if (at <= agora) {
    alvo = today();
    at = quando(alvo, hora);
    if (at <= agora) at = quando(addDays(today(), 1), hora);
  }
  out.push({ id: ID_PESO, title: 'Hora de atualizar seu peso', body: 'Leva 10 segundos: abra a aba Corpo.', at });

  return out;
}

export async function reagendar() {
  // Garante que esta semana e a próxima existam, para os lembretes terem o que avisar.
  await repo.garantirSemana(weekStart(today()));
  await repo.garantirSemana(addDays(weekStart(today()), 7));
  await repo.redistribuirFila();
  if (!nativo()) return;
  if ((await LN.checkPermissions()).display !== 'granted') return;
  await LN.createChannel({
    id: CANAL,
    name: 'Lembretes de treino',
    description: 'Treino do dia, meta da semana e peso',
    importance: 4,
  }).catch(() => {});
  const pendentes = await LN.getPending();
  if (pendentes.notifications.length) {
    await LN.cancel({ notifications: pendentes.notifications.map((n) => ({ id: n.id })) });
  }
  const lista = await montarLembretes();
  if (!lista.length) return;
  await LN.schedule({
    notifications: lista.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      channelId: CANAL,
      smallIcon: 'ic_stat_treino',
      schedule: { at: n.at, allowWhileIdle: true },
    })),
  });
}

export async function testarNotificacao() {
  if (!nativo()) return false;
  if ((await pedirPermissao()) !== 'granted') return false;
  await LN.createChannel({ id: CANAL, name: 'Lembretes de treino', importance: 4 }).catch(() => {});
  await LN.schedule({
    notifications: [
      {
        id: 9999,
        title: 'Lembretes funcionando',
        body: 'É assim que o aviso do treino vai aparecer.',
        channelId: CANAL,
        smallIcon: 'ic_stat_treino',
        schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
      },
    ],
  });
  return true;
}

export async function cancelarTodos() {
  if (!nativo()) return;
  const pendentes = await LN.getPending();
  if (pendentes.notifications.length) {
    await LN.cancel({ notifications: pendentes.notifications.map((n) => ({ id: n.id })) });
  }
}

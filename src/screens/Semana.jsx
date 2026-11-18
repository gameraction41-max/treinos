import { useState } from 'react';
import { Icon, Sheet, Empty, useApp, useLoad } from '../components/ui.jsx';
import * as repo from '../db/repo.js';
import { today, weekStart, addDays, fmtSemana, fmtDiaMes, parse, DIAS_CURTOS, DIAS_LONGOS } from '../lib/dates.js';

async function carregar(inicio) {
  await repo.garantirSemana(inicio);
  // Num dia novo, um treino perdido empurra a fila para os próximos dias.
  await repo.redistribuirFila();
  const [dias, perfil, fichas, fixos, proxima, livre, meta] = await Promise.all([
    repo.getSemana(inicio),
    repo.getPerfil(),
    repo.listFichasAtivas(),
    repo.getDiasFixos(),
    repo.proximaFichaDaFila(),
    repo.proximoDiaLivre(inicio),
    repo.metaDaSemana(inicio),
  ]);
  return { dias, perfil, fichas, fixos, proxima, livre, meta };
}

function nomeFixo(fixos, data) {
  const f = fixos.find((x) => x.dia_semana === parse(data).getDay()) || fixos[0];
  return f?.descricao || 'Atividade fixa';
}

export default function Semana() {
  const app = useApp();
  const hoje = today();
  const [inicio, setInicio] = useState(weekStart(hoje));
  const [d] = useLoad(() => carregar(inicio), [inicio]);
  if (!d) return null;

  const { dias, perfil, fichas, fixos, proxima, livre, meta } = d;
  const comeco = perfil.data_inicio && perfil.data_inicio > hoje ? perfil.data_inicio : null;
  const antesDoInicio = comeco && comeco > addDays(inicio, 6);
  const feitos = dias.filter((x) => x.feito && x.tipo !== 'descanso').length;
  const planejadosRestantes = dias.filter((x) => !x.feito && x.tipo !== 'descanso' && x.data >= hoje).length;
  const perdidos = dias.filter((x) => !x.feito && x.tipo !== 'descanso' && x.data < hoje);
  const ehSemanaAtual = inicio === weekStart(hoje);
  const faltaParaMeta = meta - feitos - planejadosRestantes;
  const mostrarSugestao = ehSemanaAtual && perdidos.length > 0 && faltaParaMeta > 0 && livre && proxima;
  const pct = Math.min(100, Math.round((feitos / Math.max(1, meta)) * 100));

  async function feito(dia, valor) {
    await repo.marcarFeito(dia.data, valor);
    app.mudou();
    if (valor) app.toast(feitos + 1 >= meta ? 'Meta da semana batida!' : 'Treino marcado como feito');
  }

  async function encaixar() {
    await repo.definirDia(livre, 'treino', null);
    app.mudou();
    app.toast(livre === hoje ? `${proxima.nome} encaixado hoje` : `${proxima.nome} encaixado na ${DIAS_LONGOS[parse(livre).getDay()].toLowerCase()}`);
  }

  function abrirDia(dia) {
    app.abrirSheet(<DiaSheet dia={dia} fichas={fichas} fixos={fixos} proxima={proxima} />);
  }

  return (
    <div className="stack">
      <div className="week-nav">
        <button className="icon-btn" aria-label="Semana anterior" onClick={() => setInicio(addDays(inicio, -7))}>
          <Icon name="esq" />
        </button>
        <div className="week-label">
          <strong>{ehSemanaAtual ? 'Esta semana' : inicio < weekStart(hoje) ? 'Semana passada' : 'Próxima semana'}</strong>
          <span>{fmtSemana(inicio)}</span>
        </div>
        <button className="icon-btn" aria-label="Próxima semana" onClick={() => setInicio(addDays(inicio, 7))}>
          <Icon name="dir" />
        </button>
      </div>

      {comeco && (
        <section className="card start-card">
          <Icon name="semana" />
          <div>
            <strong>Seus treinos começam {DIAS_LONGOS[parse(comeco).getDay()].toLowerCase()}, {fmtDiaMes(comeco)}</strong>
            <span className="row-sub">Até lá, aproveite para conhecer suas fichas.</span>
          </div>
        </section>
      )}

      {!antesDoInicio && (
      <section className="card progress-card">
        <div className="progress-text">
          <span className="big">
            {feitos} de {meta}
          </span>
          <span>treinos esta semana</span>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={feitos} aria-valuemax={meta}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="bar-steps">
          {Array.from({ length: meta }, (_, i) => (
            <span key={i} className={i < feitos ? 'on' : ''} />
          ))}
        </div>
      </section>
      )}

      {mostrarSugestao && (
        <section className="card suggest-card">
          <div>
            <strong>Um treino ficou para trás</strong>
            <p>
              Que tal fazer o <b>{proxima.nome}</b>{' '}
              {livre === hoje ? 'hoje' : `na ${DIAS_LONGOS[parse(livre).getDay()].toLowerCase()} (${fmtDiaMes(livre)})`}? A fila continua de onde
              parou.
            </p>
          </div>
          <button className="btn small" onClick={encaixar}>
            Encaixar
          </button>
        </section>
      )}

      {!fichas.length && (
        <Empty
          title="Você ainda não tem fichas"
          action={
            <button className="btn" onClick={() => app.trocarAba('fichas')}>
              Criar ficha
            </button>
          }
        >
          Os dias de treino mostram a ficha da vez assim que você criar a primeira.
        </Empty>
      )}

      <ul className="days">
        {dias.map((dia) => {
          const w = parse(dia.data).getDay();
          const ehHoje = dia.data === hoje;
          const passado = dia.data < hoje;
          const ativo = dia.tipo !== 'descanso';
          const titulo =
            dia.tipo === 'treino'
              ? dia.ficha_nome || 'Treino'
              : dia.tipo === 'pilates'
                ? nomeFixo(fixos, dia.data)
                : 'Descanso';
          let status = null;
          if (dia.feito) status = <span className="chip ok">Feito</span>;
          else if (ativo && passado) status = <span className="chip warn">Não feito</span>;
          else if (dia.tipo === 'treino' && !dia.escolha_manual && !passado) status = <span className="chip">Fila</span>;
          return (
            <li key={dia.data} className={`day ${dia.tipo} ${ehHoje ? 'today' : ''} ${dia.feito ? 'done' : ''}`}>
              <button className="day-main" onClick={() => abrirDia(dia)} disabled={dia.vazio && passado}>
                <span className="day-date">
                  <span>{DIAS_CURTOS[w]}</span>
                  <strong>{parse(dia.data).getDate()}</strong>
                </span>
                <span className="day-info">
                  <span className="day-title">{titulo}</span>
                  <span className="day-sub">
                    {ehHoje && <span className="chip today">Hoje</span>}
                    {status}
                  </span>
                </span>
              </button>
              {ativo && !dia.feito && !(dia.data > hoje) && (
                <button className="btn small done-btn" onClick={() => feito(dia, true)}>
                  <Icon name="check" size={18} /> Feito
                </button>
              )}
              {dia.feito ? (
                <button className="check-done" aria-label="Desmarcar feito" onClick={() => feito(dia, false)}>
                  <Icon name="check" size={20} stroke={2.6} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {ehSemanaAtual || inicio > hoje ? (
        <button
          className="btn ghost"
          onClick={async () => {
            await repo.replanejarSemana(inicio);
            app.mudou();
            app.toast('Semana replanejada');
          }}
        >
          Replanejar a semana
        </button>
      ) : null}
    </div>
  );
}

function DiaSheet({ dia, fichas, fixos, proxima }) {
  const app = useApp();
  const hoje = today();
  const w = parse(dia.data).getDay();
  const titulo = `${DIAS_LONGOS[w]}, ${fmtDiaMes(dia.data)}`;

  async function escolher(tipo, fichaId = null) {
    await repo.definirDia(dia.data, tipo, fichaId);
    app.fecharSheet();
    app.mudou();
  }

  const atual = (tipo, fichaId = null, manual = null) =>
    dia.tipo === tipo &&
    (tipo !== 'treino' || (manual === false ? !dia.escolha_manual : dia.escolha_manual && dia.ficha_id === fichaId));

  const Opcao = ({ on, onClick, titulo: t, sub }) => (
    <button className={`option ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="radio" />
      <span>
        <span className="option-title">{t}</span>
        {sub && <span className="option-sub">{sub}</span>}
      </span>
    </button>
  );

  return (
    <Sheet title={titulo} onClose={app.fecharSheet}>
      {dia.feito ? (
        <div className="note ok">
          Feito.{' '}
          <button
            className="link"
            onClick={async () => {
              await repo.marcarFeito(dia.data, false);
              app.fecharSheet();
              app.mudou();
            }}
          >
            Desmarcar
          </button>
        </div>
      ) : null}
      <div className="options">
        {fichas.length > 0 && (
          <Opcao
            on={atual('treino', null, false)}
            onClick={() => escolher('treino')}
            titulo="Próximo da fila"
            sub={dia.tipo === 'treino' && !dia.escolha_manual ? dia.ficha_nome : proxima?.nome}
          />
        )}
        {fichas.map((f) => (
          <Opcao key={f.id} on={atual('treino', f.id)} onClick={() => escolher('treino', f.id)} titulo={f.nome} sub="Escolher esta ficha" />
        ))}
        {(fixos.length > 0 || dia.tipo === 'pilates') && (
          <Opcao on={dia.tipo === 'pilates'} onClick={() => escolher('pilates')} titulo={nomeFixo(fixos, dia.data)} sub="Atividade fixa" />
        )}
        <Opcao on={dia.tipo === 'descanso'} onClick={() => escolher('descanso')} titulo="Descanso" />
      </div>
      {dia.tipo === 'treino' && dia.ficha_id ? (
        <button
          className="btn ghost full"
          onClick={() => {
            app.fecharSheet();
            app.ir('ficha', { id: dia.ficha_id });
          }}
        >
          Ver a ficha
        </button>
      ) : null}
      {!dia.feito && dia.tipo !== 'descanso' && dia.data <= hoje ? (
        <button
          className="btn full"
          onClick={async () => {
            await repo.marcarFeito(dia.data, true);
            app.fecharSheet();
            app.mudou();
          }}
        >
          Marcar como feito
        </button>
      ) : null}
    </Sheet>
  );
}

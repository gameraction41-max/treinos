import { useState } from 'react';
import { Icon, PageHeader, Segmented, Sheet, useApp, useLoad, NIVEIS } from '../components/ui.jsx';
import * as repo from '../db/repo.js';
import { DIAS_LONGOS, DIAS_CURTOS, weekStart, today, addDays, fmtDiaMes, parse } from '../lib/dates.js';
import { ORDEM_SEMANA, lerDias } from '../lib/planner.js';
import { EscolhaData } from '../components/EscolhaData.jsx';
import { permissaoNotificacoes, pedirPermissao, testarNotificacao, cancelarTodos } from '../lib/lembretes.js';
import { apagarFoto } from '../lib/imagens.js';
import { Capacitor } from '@capacitor/core';

async function carregar() {
  const [perfil, fixos, academia, permissao] = await Promise.all([
    repo.getPerfil(),
    repo.getDiasFixos(),
    repo.getDiasAcademia(),
    permissaoNotificacoes(),
  ]);
  return { perfil, fixos, academia: academia.dias, permissao };
}

// Mudanças na meta ou nos dias fixos replanejam esta semana e a próxima (de hoje em diante).
async function replanejar() {
  const s = weekStart(today());
  await repo.replanejarSemana(s);
  await repo.replanejarSemana(addDays(s, 7));
}

export default function Config() {
  const app = useApp();
  const [d] = useLoad(carregar, []);
  if (!d) return <PageHeader title="Configurações" />;
  const { perfil, fixos, academia, permissao } = d;
  const diasFixos = new Set(fixos.map((f) => f.dia_semana));
  const nomeFixo = fixos[0]?.descricao || 'Fixa';

  async function fixosMudaram() {
    await repo.ajustarDiasAcademia();
    await replanejar();
  }

  async function salvar(campos, replan = false) {
    await repo.savePerfil(campos);
    if (replan) await replanejar();
    app.mudou();
  }

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="stack">
        <section className="card settings">
          <h3 className="card-title">Semana</h3>
          <div className="setting column">
            <div>
              <strong>Dias de academia</strong>
              <span className="row-sub">Valem a partir de hoje</span>
            </div>
            <GradeDias dias={academia} fixos={diasFixos} nomeFixo={nomeFixo} />
            <div className="week-preview small">
              <span className="big">{perfil.meta_semanal}</span>
              <span>
                treino{perfil.meta_semanal > 1 ? 's' : ''} por semana: {academia.length} de academia
                {fixos.length ? ` + ${nomeFixo} (${fixos.length}x)` : ''}
              </span>
            </div>
            {perfil.mudanca_em && (
              <div className="note mudanca-note">
                <span>
                  A partir de <b>{fmtDiaMes(perfil.mudanca_em)}</b>:{' '}
                  {(lerDias(perfil.mudanca_dias) || []).map((x) => DIAS_CURTOS[x]).join(', ') || 'só a atividade fixa'}
                </span>
                <button
                  className="link"
                  onClick={async () => {
                    await repo.cancelarMudanca();
                    app.mudou();
                    app.toast('Mudança cancelada');
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
            <button
              className="btn ghost small left"
              onClick={() =>
                app.abrirSheet(
                  <MudarDias
                    atuais={perfil.mudanca_em ? lerDias(perfil.mudanca_dias) || [] : academia}
                    fixos={diasFixos}
                    nomeFixo={nomeFixo}
                    dataInicial={perfil.mudanca_em || today()}
                  />,
                )
              }
            >
              <Icon name="editar" size={18} /> Mudar dias
            </button>
          </div>
          <div className="setting column">
            <div>
              <strong>Atividade fixa</strong>
              <span className="row-sub">Ex.: Pilates, natação. Conta na meta, mas não ocupa dia de academia</span>
            </div>
            {!fixos.length && <span className="hint small">Nenhuma. Sua meta é só de academia.</span>}
            <ul className="fixed-list">
              {fixos.map((f) => (
                <li key={f.id}>
                  <span>
                    <b>{DIAS_LONGOS[f.dia_semana]}</b> — {f.descricao}
                  </span>
                  <button
                    className="icon-btn sm"
                    aria-label={`Remover ${f.descricao}`}
                    onClick={async () => {
                      await repo.removeDiaFixo(f.id);
                      await fixosMudaram();
                      app.mudou();
                    }}
                  >
                    <Icon name="lixo" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn ghost small" onClick={() => app.abrirSheet(<NovoFixo usados={fixos.map((f) => f.dia_semana)} nomeAtual={fixos[0]?.descricao} onSalvo={fixosMudaram} />)}>
              <Icon name="mais" size={18} /> {fixos.length ? 'Adicionar outro dia' : 'Adicionar atividade fixa'}
            </button>
          </div>
          <div className="setting column">
            <strong>Nível</strong>
            <Segmented options={NIVEIS} value={perfil.nivel} onChange={(v) => salvar({ nivel: v })} />
            <span className="row-sub">Usado para recomendar as fichas sugeridas.</span>
          </div>
        </section>

        <section className="card settings">
          <h3 className="card-title">Lembretes</h3>
          {permissao !== 'granted' && Capacitor.isNativePlatform() && (
            <div className="note warn">
              As notificações estão bloqueadas.{' '}
              <button
                className="link"
                onClick={async () => {
                  await pedirPermissao();
                  app.mudou();
                }}
              >
                Permitir
              </button>
            </div>
          )}
          <div className="setting">
            <div>
              <strong>Horário do lembrete</strong>
              <span className="row-sub">Nos dias com treino ou atividade fixa</span>
            </div>
            <input type="time" className="time" value={perfil.hora_lembrete} onChange={(e) => e.target.value && salvar({ hora_lembrete: e.target.value })} />
          </div>
          <div className="setting column">
            <strong>Lembrete para atualizar o peso</strong>
            <Segmented
              options={[
                { value: 15, label: 'A cada 15 dias' },
                { value: 30, label: 'A cada 30 dias' },
              ]}
              value={Number(perfil.lembrete_peso_dias)}
              onChange={(v) => salvar({ lembrete_peso_dias: v })}
            />
          </div>
          <p className="hint small">
            Na quinta-feira o app também avisa se faltar mais de um treino para a meta. Em alguns celulares (Xiaomi, Samsung) é preciso tirar o app da
            otimização de bateria para os avisos chegarem na hora.
          </p>
          {Capacitor.isNativePlatform() && (
            <button
              className="btn ghost small"
              onClick={async () => {
                const ok = await testarNotificacao();
                app.toast(ok ? 'Notificação de teste em 3 segundos' : 'Permita as notificações primeiro');
              }}
            >
              <Icon name="sino" size={18} /> Testar notificação
            </button>
          )}
        </section>

        <section className="card settings">
          <h3 className="card-title">Dados</h3>
          <p className="hint small">Apaga fichas, semana, peso, fotos e configurações, e volta para a tela de boas-vindas.</p>
          <button className="btn danger ghost small left" onClick={() => app.abrirSheet(<Recomecar />)}>
            <Icon name="lixo" size={18} /> Recomeçar do zero
          </button>
        </section>

        <p className="hint small center">Seus dados ficam só neste celular: sem conta, sem internet. Desinstalar o app apaga tudo.</p>
      </div>
    </>
  );
}

function GradeDias({ dias, fixos, nomeFixo, onToggle }) {
  return (
    <div className="dias-grid" role="group" aria-label="Dias de academia">
      {ORDEM_SEMANA.map((dia) => {
        const fixo = fixos.has(dia);
        const on = dias.includes(dia);
        return (
          <button
            key={dia}
            aria-pressed={on}
            aria-label={DIAS_LONGOS[dia]}
            className={`dia-btn ${on ? 'on' : ''} ${fixo ? 'fixo' : ''} ${onToggle ? '' : 'leitura'}`}
            disabled={fixo || !onToggle}
            onClick={() => onToggle?.(dia)}
          >
            <span>{DIAS_CURTOS[dia]}</span>
            <small>{fixo ? nomeFixo.slice(0, 7) : on ? 'Treino' : ''}</small>
          </button>
        );
      })}
    </div>
  );
}

function MudarDias({ atuais, fixos, nomeFixo, dataInicial }) {
  const app = useApp();
  const [dias, setDias] = useState(atuais);
  const [data, setData] = useState(dataInicial);
  const [salvando, setSalvando] = useState(false);
  const alternar = (d) => setDias((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]));
  const vazio = !dias.length && !fixos.size;
  const meta = dias.length + fixos.size;
  const hoje = today();
  return (
    <Sheet
      title="Mudar dias de academia"
      onClose={app.fecharSheet}
      footer={
        <button
          className="btn full"
          disabled={vazio || salvando}
          onClick={async () => {
            setSalvando(true);
            await repo.mudarDiasAcademia(dias, data);
            app.fecharSheet();
            app.mudou();
            app.toast(data <= hoje ? 'Dias atualizados' : `Mudança agendada para ${fmtDiaMes(data)}`);
          }}
        >
          Salvar
        </button>
      }
    >
      <div className="field">
        <span>Quais dias?</span>
        <GradeDias dias={dias} fixos={fixos} nomeFixo={nomeFixo} onToggle={alternar} />
        <span className="hint small">
          {vazio ? 'Escolha pelo menos um dia.' : `Nova meta: ${meta} treino${meta > 1 ? 's' : ''} por semana.`}
        </span>
      </div>
      <div className="field">
        <span>A partir de quando?</span>
        <EscolhaData valor={data} onChange={setData} />
        <span className="hint small">
          {data <= hoje
            ? 'Os próximos dias desta semana já mudam.'
            : `Até ${DIAS_LONGOS[parse(addDays(data, -1)).getDay()].toLowerCase()}, ${fmtDiaMes(addDays(data, -1))}, fica tudo como está.`}
        </span>
      </div>
    </Sheet>
  );
}

function NovoFixo({ usados, nomeAtual, onSalvo }) {
  const app = useApp();
  const livres = [1, 2, 3, 4, 5, 6, 0].filter((d) => !usados.includes(d));
  const [dia, setDia] = useState(livres[0] ?? 6);
  const [desc, setDesc] = useState(nomeAtual || '');
  return (
    <Sheet
      title="Atividade fixa"
      onClose={app.fecharSheet}
      footer={
        <button
          className="btn full"
          disabled={!desc.trim() || !livres.length}
          onClick={async () => {
            await repo.addDiaFixo(dia, desc.trim());
            await onSalvo();
            app.fecharSheet();
            app.mudou();
          }}
        >
          Salvar
        </button>
      }
    >
      <label className="field">
        <span>Qual atividade?</span>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Pilates" />
      </label>
      <div className="field">
        <span>Dia da semana</span>
        <div className="chips-wrap">
          {livres.map((d) => (
            <button key={d} className={`chip-btn ${dia === d ? 'on' : ''}`} onClick={() => setDia(d)}>
              {DIAS_LONGOS[d]}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function Recomecar() {
  const app = useApp();
  const [apagando, setApagando] = useState(false);
  return (
    <Sheet
      title="Recomeçar do zero?"
      onClose={app.fecharSheet}
      footer={
        <div className="foot-row">
          <button className="btn ghost" onClick={app.fecharSheet}>
            Cancelar
          </button>
          <button
            className="btn danger"
            disabled={apagando}
            onClick={async () => {
              setApagando(true);
              const fotos = await repo.apagarTudo();
              await cancelarTodos().catch(() => {});
              for (const f of fotos) await apagarFoto(f);
              location.hash = '';
              location.reload();
            }}
          >
            Apagar tudo
          </button>
        </div>
      }
    >
      <p>
        Todas as suas fichas, a agenda, os registros de peso, as fotos e as configurações serão apagados. O app volta para a tela de boas-vindas,
        com os exercícios e as sugestões originais. <b>Isso não pode ser desfeito.</b>
      </p>
    </Sheet>
  );
}

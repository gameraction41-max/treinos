import { useState } from 'react';
import { Icon, PageHeader, Segmented, Stepper, Sheet, useApp, useLoad, NIVEIS } from '../components/ui.jsx';
import * as repo from '../db/repo.js';
import { DIAS_LONGOS, weekStart, today, addDays } from '../lib/dates.js';
import { permissaoNotificacoes, pedirPermissao, testarNotificacao, cancelarTodos } from '../lib/lembretes.js';
import { apagarFoto } from '../lib/imagens.js';
import { Capacitor } from '@capacitor/core';

async function carregar() {
  const [perfil, fixos, permissao] = await Promise.all([repo.getPerfil(), repo.getDiasFixos(), permissaoNotificacoes()]);
  return { perfil, fixos, permissao };
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
  const { perfil, fixos, permissao } = d;

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
          <div className="setting">
            <div>
              <strong>Meta de treinos por semana</strong>
              <span className="row-sub">Inclui a atividade fixa, se você tiver</span>
            </div>
            <Stepper value={Number(perfil.meta_semanal)} min={1} max={7} onChange={(v) => salvar({ meta_semanal: v }, true)} />
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
                      await replanejar();
                      app.mudou();
                    }}
                  >
                    <Icon name="lixo" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn ghost small" onClick={() => app.abrirSheet(<NovoFixo usados={fixos.map((f) => f.dia_semana)} nomeAtual={fixos[0]?.descricao} onSalvo={replanejar} />)}>
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

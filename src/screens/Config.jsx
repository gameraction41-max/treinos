import { useState } from 'react';
import { Icon, PageHeader, Segmented, Stepper, Sheet, useApp, useLoad, NIVEIS } from '../components/ui.jsx';
import * as repo from '../db/repo.js';
import { DIAS_LONGOS, weekStart, today, addDays } from '../lib/dates.js';
import { permissaoNotificacoes, pedirPermissao, testarNotificacao } from '../lib/lembretes.js';
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
              <span className="row-sub">Inclui os dias fixos, como o Pilates</span>
            </div>
            <Stepper value={Number(perfil.meta_semanal)} min={1} max={7} onChange={(v) => salvar({ meta_semanal: v }, true)} />
          </div>
          <div className="setting column">
            <div>
              <strong>Dias fixos</strong>
              <span className="row-sub">Contam na meta, mas não ocupam dia de academia</span>
            </div>
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
            <button className="btn ghost small" onClick={() => app.abrirSheet(<NovoFixo usados={fixos.map((f) => f.dia_semana)} onSalvo={replanejar} />)}>
              <Icon name="mais" size={18} /> Adicionar dia fixo
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
              <span className="row-sub">Nos dias com treino ou Pilates</span>
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

        <p className="hint small center">Seus dados ficam só neste celular: sem conta, sem internet. Desinstalar o app apaga tudo.</p>
      </div>
    </>
  );
}

function NovoFixo({ usados, onSalvo }) {
  const app = useApp();
  const livres = [1, 2, 3, 4, 5, 6, 0].filter((d) => !usados.includes(d));
  const [dia, setDia] = useState(livres[0] ?? 6);
  const [desc, setDesc] = useState('Pilates');
  return (
    <Sheet
      title="Novo dia fixo"
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
      <label className="field">
        <span>O que é</span>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Pilates, Natação" />
      </label>
    </Sheet>
  );
}

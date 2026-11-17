import { useState } from 'react';
import { Segmented, Stepper, NIVEIS, useApp } from '../components/ui.jsx';
import { DIAS_LONGOS } from '../lib/dates.js';
import * as repo from '../db/repo.js';
import { divisaoSugerida } from '../lib/planner.js';
import { pedirPermissao } from '../lib/lembretes.js';

// Primeira abertura: poucas perguntas para montar a primeira semana.
export default function Boasvindas({ onPronto }) {
  const app = useApp();
  const [nivel, setNivel] = useState('iniciante');
  const [meta, setMeta] = useState(4);
  const [temFixa, setTemFixa] = useState(false);
  const [nomeFixa, setNomeFixa] = useState('');
  const [diasFixa, setDiasFixa] = useState([]);
  const [hora, setHora] = useState('07:00');
  const [sugestao, setSugestao] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const qtdFixa = temFixa ? diasFixa.length : 0;
  const diasAcademia = Math.max(1, meta - qtdFixa);
  const fixaIncompleta = temFixa && (!nomeFixa.trim() || !diasFixa.length);
  const alternarDia = (d) => setDiasFixa((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]));

  async function comecar() {
    setSalvando(true);
    try {
      await repo.savePerfil({ nivel, meta_semanal: meta, hora_lembrete: hora });
      for (const f of await repo.getDiasFixos()) await repo.removeDiaFixo(f.id);
      if (temFixa) for (const d of diasFixa) await repo.addDiaFixo(d, nomeFixa.trim());
      if (sugestao) {
        const dv = divisaoSugerida(await repo.listDivisoes(), nivel, diasAcademia);
        if (dv) await repo.usarSugestao(dv.divisao);
      }
      await repo.savePerfil({ configurado: 1 });
      // A permissão nunca pode segurar a entrada no app.
      await Promise.race([pedirPermissao().catch(() => {}), new Promise((r) => setTimeout(r, 20000))]);
      onPronto();
    } catch (e) {
      console.error(e);
      app.toast('Algo deu errado. Tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <div className="welcome">
      <div className="welcome-head">
        <div className="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
          </svg>
        </div>
        <h1>Vamos montar sua semana</h1>
        <p>Leva um minuto. Dá para mudar tudo depois em Configurações.</p>
      </div>

      <div className="stack">
        <section className="card settings">
          <div className="setting column">
            <strong>Seu nível</strong>
            <Segmented options={NIVEIS} value={nivel} onChange={setNivel} />
          </div>
          <div className="setting">
            <div>
              <strong>Treinos por semana</strong>
              <span className="row-sub">{temFixa ? 'Contando a atividade fixa' : 'Academia e outras atividades'}</span>
            </div>
            <Stepper value={meta} min={1} max={7} onChange={setMeta} />
          </div>
          <label className="setting toggle">
            <div>
              <strong>Tenho uma atividade fixa</strong>
              <span className="row-sub">Ex.: Pilates, natação, luta. Conta na meta, mas não ocupa dia de academia</span>
            </div>
            <input type="checkbox" checked={temFixa} onChange={(e) => setTemFixa(e.target.checked)} />
          </label>
          {temFixa && (
            <div className="setting column fixa">
              <label className="field">
                <span>Qual atividade?</span>
                <input value={nomeFixa} onChange={(e) => setNomeFixa(e.target.value)} placeholder="Ex.: Pilates" />
              </label>
              <div className="field">
                <span>Em que dia(s) da semana?</span>
                <div className="chips-wrap">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <button key={d} className={`chip-btn ${diasFixa.includes(d) ? 'on' : ''}`} onClick={() => alternarDia(d)}>
                      {DIAS_LONGOS[d]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="setting">
            <div>
              <strong>Lembrete do treino</strong>
              <span className="row-sub">No dia do treino</span>
            </div>
            <input type="time" className="time" value={hora} onChange={(e) => e.target.value && setHora(e.target.value)} />
          </div>
          <label className="setting toggle">
            <div>
              <strong>Criar fichas sugeridas</strong>
              <span className="row-sub">
                Para {NIVEIS.find((n) => n.value === nivel).label.toLowerCase()} com {diasAcademia} dia{diasAcademia > 1 ? 's' : ''} de academia
              </span>
            </div>
            <input type="checkbox" checked={sugestao} onChange={(e) => setSugestao(e.target.checked)} />
          </label>
        </section>
        <button className="btn full big" disabled={salvando || fixaIncompleta} onClick={comecar}>
          Começar
        </button>
        <p className="hint small center">O app vai pedir permissão para mandar os lembretes.</p>
      </div>
    </div>
  );
}

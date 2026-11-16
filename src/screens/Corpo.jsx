import { useState } from 'react';
import { Icon, Sheet, Empty, useApp, useLoad, fmtNum, parseNum } from '../components/ui.jsx';
import * as repo from '../db/repo.js';
import { imc, classificarImc } from '../lib/planner.js';
import { today, daysBetween, fmtData, fmtDiaMes } from '../lib/dates.js';

async function carregar() {
  const [perfil, registros] = await Promise.all([repo.getPerfil(), repo.listPeso()]);
  return { perfil, registros };
}

export default function Corpo() {
  const app = useApp();
  const [d] = useLoad(carregar, []);
  if (!d) return null;
  const { perfil, registros } = d;
  const ultimo = registros[registros.length - 1];
  const valorImc = imc(ultimo?.peso_kg, perfil.altura_cm);
  const dias = ultimo ? daysBetween(ultimo.data, today()) : null;
  const atrasado = dias != null && dias >= Number(perfil.lembrete_peso_dias);

  return (
    <div className="stack">
      <section className="card body-card">
        <div className="imc">
          <span className="label">IMC</span>
          <span className="big">{valorImc ? fmtNum(valorImc) : '—'}</span>
          <span className={`imc-class ${valorImc ? (valorImc >= 18.5 && valorImc < 25 ? 'ok' : 'warn') : ''}`}>
            {valorImc ? classificarImc(valorImc) : !perfil.altura_cm ? 'Cadastre sua altura' : 'Registre seu peso'}
          </span>
        </div>
        <div className="body-stats">
          <button className="stat" onClick={() => app.abrirSheet(<PesoSheet />)}>
            <span className="label">Peso</span>
            <strong>{ultimo ? `${fmtNum(ultimo.peso_kg)} kg` : '—'}</strong>
            <span className="row-sub">{ultimo ? (dias === 0 ? 'hoje' : `há ${dias} dia${dias > 1 ? 's' : ''}`) : 'nenhum registro'}</span>
          </button>
          <button className="stat" onClick={() => app.abrirSheet(<AlturaSheet altura={perfil.altura_cm} />)}>
            <span className="label">Altura</span>
            <strong>{perfil.altura_cm ? `${fmtNum(perfil.altura_cm, 0)} cm` : '—'}</strong>
            <span className="row-sub">{perfil.altura_cm ? 'tocar para editar' : 'tocar para cadastrar'}</span>
          </button>
        </div>
      </section>

      {atrasado && (
        <div className="note warn">
          <Icon name="sino" size={18} /> Já faz {dias} dias desde o último registro. Hora de atualizar seu peso.
        </div>
      )}

      <button className="btn full" onClick={() => app.abrirSheet(<PesoSheet />)}>
        <Icon name="mais" size={20} /> Registrar peso
      </button>

      <section className="card">
        <h3 className="card-title">Evolução do peso</h3>
        {registros.length >= 2 ? (
          <Grafico registros={registros} />
        ) : (
          <p className="hint">O gráfico aparece a partir do segundo registro.</p>
        )}
      </section>

      {registros.length > 0 && (
        <section className="card">
          <h3 className="card-title">Histórico</h3>
          <ul className="history">
            {[...registros].reverse().map((r, i, arr) => {
              const ant = arr[i + 1];
              const diff = ant ? r.peso_kg - ant.peso_kg : null;
              return (
                <li key={r.id}>
                  <span>{fmtData(r.data)}</span>
                  <strong>{fmtNum(r.peso_kg)} kg</strong>
                  <span className={`diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>
                    {diff != null && diff !== 0 ? `${diff > 0 ? '+' : '−'}${fmtNum(Math.abs(diff))}` : ''}
                  </span>
                  <button
                    className="icon-btn sm"
                    aria-label="Apagar registro"
                    onClick={async () => {
                      await repo.deletePeso(r.id);
                      app.mudou();
                    }}
                  >
                    <Icon name="lixo" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {!registros.length && !perfil.altura_cm && <Empty title="Comece pela altura e pelo peso">Com os dois, o app calcula o seu IMC.</Empty>}
    </div>
  );
}

function Grafico({ registros }) {
  const W = 320;
  const H = 150;
  const P = { t: 14, r: 12, b: 24, l: 36 };
  const pesos = registros.map((r) => r.peso_kg);
  let min = Math.min(...pesos);
  let max = Math.max(...pesos);
  if (max - min < 2) {
    min -= 1;
    max += 1;
  }
  const t0 = new Date(registros[0].data).getTime();
  const t1 = new Date(registros[registros.length - 1].data).getTime();
  const x = (r, i) =>
    P.l + (t1 > t0 ? ((new Date(r.data).getTime() - t0) / (t1 - t0)) : i / (registros.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const pts = registros.map((r, i) => [x(r, i), y(r.peso_kg)]);
  const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${linha} L${pts[pts.length - 1][0].toFixed(1)},${H - P.b} L${pts[0][0].toFixed(1)},${H - P.b} Z`;
  const ticks = [min, (min + max) / 2, max];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico da evolução do peso">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" />
          <text x={P.l - 6} y={y(t) + 4} textAnchor="end" className="axis">
            {fmtNum(t, 0)}
          </text>
        </g>
      ))}
      <path d={area} className="area" />
      <path d={linha} className="line" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 3} className={i === pts.length - 1 ? 'dot last' : 'dot'} />
      ))}
      <text x={pts[0][0]} y={H - 6} className="axis" textAnchor="start">
        {fmtDiaMes(registros[0].data)}
      </text>
      <text x={pts[pts.length - 1][0]} y={H - 6} className="axis" textAnchor="end">
        {fmtDiaMes(registros[registros.length - 1].data)}
      </text>
    </svg>
  );
}

function PesoSheet() {
  const app = useApp();
  const [peso, setPeso] = useState('');
  const [data, setData] = useState(today());
  const valor = parseNum(peso);
  const valido = valor && valor > 20 && valor < 400 && data;
  return (
    <Sheet
      title="Registrar peso"
      onClose={app.fecharSheet}
      footer={
        <button
          className="btn full"
          disabled={!valido}
          onClick={async () => {
            await repo.addPeso(data, valor);
            app.fecharSheet();
            app.mudou();
            app.toast('Peso registrado');
          }}
        >
          Salvar
        </button>
      }
    >
      <label className="field">
        <span>Peso (kg)</span>
        <input autoFocus inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex.: 78,5" />
      </label>
      <label className="field">
        <span>Data</span>
        <input type="date" value={data} max={today()} onChange={(e) => setData(e.target.value)} />
      </label>
    </Sheet>
  );
}

function AlturaSheet({ altura }) {
  const app = useApp();
  const [v, setV] = useState(altura ? String(altura) : '');
  const valor = parseNum(v);
  return (
    <Sheet
      title="Altura"
      onClose={app.fecharSheet}
      footer={
        <button
          className="btn full"
          disabled={!(valor > 80 && valor < 250)}
          onClick={async () => {
            await repo.savePerfil({ altura_cm: valor });
            app.fecharSheet();
            app.mudou();
          }}
        >
          Salvar
        </button>
      }
    >
      <label className="field">
        <span>Altura (cm)</span>
        <input autoFocus inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} placeholder="Ex.: 175" />
      </label>
    </Sheet>
  );
}

import { useState } from 'react';
import { PageHeader, Thumb, useApp, useLoad, nomeNivel } from '../components/ui.jsx';
import * as repo from '../db/repo.js';
import { divisaoSugerida } from '../lib/planner.js';

async function carregar() {
  const [divisoes, perfil, fixos] = await Promise.all([repo.listDivisoes(), repo.getPerfil(), repo.getDiasFixos()]);
  const diasAcademia = Math.max(1, Number(perfil.meta_semanal) - fixos.length);
  const recomendada = divisaoSugerida(divisoes, perfil.nivel, diasAcademia);
  for (const dv of divisoes) {
    for (const f of dv.fichas) f.itens = await repo.getModeloItens(f.id);
  }
  return { divisoes, perfil, diasAcademia, recomendada };
}

const textoDias = (d) => `${d.replace('-', ' a ')} dias`;

export default function Sugestoes() {
  const app = useApp();
  const [d] = useLoad(carregar, []);
  const [aberta, setAberta] = useState(null);
  if (!d) return <PageHeader title="Usar sugestão" />;

  const outras = d.divisoes.filter((x) => x.divisao !== d.recomendada?.divisao);

  async function usar(dv) {
    await repo.usarSugestao(dv.divisao);
    await repo.redistribuirFila();
    app.mudou();
    app.toast(`${dv.fichas.length} fichas adicionadas à fila`);
    app.voltar();
  }

  return (
    <>
      <PageHeader title="Usar sugestão" />
      <div className="stack">
        <p className="hint">
          Para <b>{nomeNivel(d.perfil.nivel).toLowerCase()}</b> com <b>{d.diasAcademia}</b> dia{d.diasAcademia > 1 ? 's' : ''} de academia por
          semana (o Pilates conta na meta, mas não ocupa dia de academia).
        </p>
        {d.recomendada && <Divisao dv={d.recomendada} destaque onUsar={usar} />}
        <h3 className="section-title">Outras sugestões</h3>
        {outras.map((dv) => (
          <Divisao
            key={dv.divisao}
            dv={dv}
            fechada={aberta !== dv.divisao}
            onAbrir={() => setAberta(aberta === dv.divisao ? null : dv.divisao)}
            onUsar={usar}
          />
        ))}
        <p className="hint small">
          Os modelos são genéricos. Se você tiver alguma limitação física, vale pedir a um professor da academia para revisar a ficha.
        </p>
      </div>
    </>
  );
}

function Divisao({ dv, destaque, fechada, onAbrir, onUsar }) {
  return (
    <section className={`card model ${destaque ? 'highlight' : ''}`}>
      <button className="model-head" onClick={onAbrir} disabled={!onAbrir}>
        {destaque && <span className="chip accent">Recomendado para você</span>}
        <strong>{dv.divisao}</strong>
        <span className="row-sub">
          {nomeNivel(dv.nivel)} · {textoDias(dv.dias_semana)} · {dv.fichas.length} fichas
        </span>
      </button>
      {!fechada && (
        <>
          {dv.fichas.map((f) => (
            <div key={f.id} className="model-ficha">
              <strong>{f.nome}</strong>
              <ul>
                {f.itens.map((it) => (
                  <li key={it.id}>
                    <Thumb imagem={it.imagem_url} grupo={it.grupo_muscular} size={28} />
                    <span>{it.nome}</span>
                    <span className="muted-text">
                      {it.series} × {it.repeticoes}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button className="btn full" onClick={() => onUsar(dv)}>
            Usar esta sugestão
          </button>
        </>
      )}
    </section>
  );
}

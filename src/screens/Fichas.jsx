import { useState } from 'react';
import { Icon, Sheet, Empty, useApp, useLoad } from '../components/ui.jsx';
import * as repo from '../db/repo.js';

async function carregar() {
  const [fichas, proxima] = await Promise.all([repo.listFichas(), repo.proximaFichaDaFila()]);
  return { fichas, proxima };
}

export default function Fichas() {
  const app = useApp();
  const [d] = useLoad(carregar, []);
  if (!d) return null;
  const ativas = d.fichas.filter((f) => f.ativa);
  const inativas = d.fichas.filter((f) => !f.ativa);

  async function mover(id, delta) {
    await repo.moverFicha(id, delta);
    await repo.redistribuirFila();
    app.mudou();
  }

  const novaFicha = () => app.abrirSheet(<NovaFichaSheet />);

  return (
    <div className="stack">
      {ativas.length ? (
        <>
          <p className="hint">As fichas rodam nesta ordem: depois da última, volta para a primeira.</p>
          <ul className="list">
            {ativas.map((f, i) => (
              <li key={f.id} className="row">
                <button className="row-main" onClick={() => app.ir('ficha', { id: f.id })}>
                  <span className="queue-badge">{i + 1}</span>
                  <span className="row-text">
                    <span className="row-title">{f.nome}</span>
                    <span className="row-sub">
                      {f.n_itens} exercício{Number(f.n_itens) === 1 ? '' : 's'}
                      {f.modelo_origem_id ? ' · sugestão' : ''}
                    </span>
                    {d.proxima?.id === f.id && <span className="chip accent">Próximo treino</span>}
                  </span>
                </button>
                <span className="reorder">
                  <button className="icon-btn sm" aria-label="Subir" disabled={i === 0} onClick={() => mover(f.id, -1)}>
                    <Icon name="cima" size={18} />
                  </button>
                  <button className="icon-btn sm" aria-label="Descer" disabled={i === ativas.length - 1} onClick={() => mover(f.id, 1)}>
                    <Icon name="baixo" size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Empty title="Nenhuma ficha ainda">Use uma sugestão pronta para o seu nível ou monte a sua do zero.</Empty>
      )}

      <button className="btn full" onClick={novaFicha}>
        <Icon name="mais" size={20} /> Nova ficha
      </button>

      {inativas.length > 0 && (
        <>
          <h3 className="section-title">Fora da fila</h3>
          <ul className="list">
            {inativas.map((f) => (
              <li key={f.id} className="row muted">
                <button className="row-main" onClick={() => app.ir('ficha', { id: f.id })}>
                  <span className="queue-badge off">–</span>
                  <span className="row-text">
                    <span className="row-title">{f.nome}</span>
                    <span className="row-sub">{f.n_itens} exercícios</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function NovaFichaSheet() {
  const app = useApp();
  const [modo, setModo] = useState(null);
  const [nome, setNome] = useState('');

  if (modo === 'zero') {
    return (
      <Sheet
        title="Começar do zero"
        onClose={app.fecharSheet}
        footer={
          <button
            className="btn full"
            disabled={!nome.trim()}
            onClick={async () => {
              const id = await repo.criarFicha(nome.trim());
              app.fecharSheet();
              app.mudou();
              app.ir('ficha', { id });
            }}
          >
            Criar e escolher exercícios
          </button>
        }
      >
        <label className="field">
          <span>Nome da ficha</span>
          <input autoFocus value={nome} placeholder="Ex.: Treino C — pernas" onChange={(e) => setNome(e.target.value)} />
        </label>
      </Sheet>
    );
  }

  return (
    <Sheet title="Nova ficha" onClose={app.fecharSheet}>
      <div className="choice-list">
        <button
          className="choice"
          onClick={() => {
            app.fecharSheet();
            app.ir('sugestoes');
          }}
        >
          <span className="choice-icon accent">
            <Icon name="estrela" />
          </span>
          <span>
            <strong>Usar sugestão</strong>
            <span>Fichas prontas para o seu nível e dias de academia. Depois você edita como quiser.</span>
          </span>
        </button>
        <button className="choice" onClick={() => setModo('zero')}>
          <span className="choice-icon">
            <Icon name="editar" />
          </span>
          <span>
            <strong>Começar do zero</strong>
            <span>Dê um nome e escolha os exercícios na biblioteca.</span>
          </span>
        </button>
      </div>
    </Sheet>
  );
}

import { useEffect, useState } from 'react';
import { Icon, PageHeader, Sheet, Thumb, Empty, Stepper, useApp, useLoad, fmtNum, parseNum } from '../components/ui.jsx';
import * as repo from '../db/repo.js';
import { SeletorExercicios } from './Exercicios.jsx';
import { novaFoto, apagarFoto, srcDaImagem } from '../lib/imagens.js';

export default function FichaEditor({ id }) {
  const app = useApp();
  const [ficha] = useLoad(() => repo.getFicha(id), [id]);
  if (!ficha) return <PageHeader title="Ficha" />;

  async function mover(itemId, delta) {
    await repo.moverItem(id, itemId, delta);
    app.mudou();
  }

  const menu = () => app.abrirSheet(<MenuFicha ficha={ficha} />);

  return (
    <>
      <PageHeader
        title={ficha.nome}
        actions={
          <button className="icon-btn" aria-label="Mais opções" onClick={menu}>
            <Icon name="mais_opcoes" />
          </button>
        }
      />
      <div className="stack">
        {!ficha.ativa && <div className="note">Esta ficha está fora da fila de treinos.</div>}
        {ficha.itens.length ? (
          <ul className="list exercises">
            {ficha.itens.map((it, i) => (
              <li key={it.id} className="row">
                <button className="row-main" onClick={() => app.abrirSheet(<ItemSheet item={it} />)}>
                  <Thumb imagem={it.imagem_url} grupo={it.grupo_muscular} size={52} />
                  <span className="row-text">
                    <span className="row-title">{it.nome}</span>
                    <span className="row-sub">
                      {it.series} × {it.repeticoes}
                      {it.carga_kg != null ? ` · ${fmtNum(it.carga_kg)} kg` : ''}
                    </span>
                    {it.observacao && <span className="row-note">{it.observacao}</span>}
                  </span>
                </button>
                <span className="reorder">
                  <button className="icon-btn sm" aria-label="Subir" disabled={i === 0} onClick={() => mover(it.id, -1)}>
                    <Icon name="cima" size={18} />
                  </button>
                  <button className="icon-btn sm" aria-label="Descer" disabled={i === ficha.itens.length - 1} onClick={() => mover(it.id, 1)}>
                    <Icon name="baixo" size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Ficha vazia">Adicione exercícios da biblioteca.</Empty>
        )}

        <button
          className="btn full"
          onClick={() =>
            app.abrirSheet(
              <SeletorExercicios
                jaNaFicha={ficha.itens.map((x) => x.exercicio_id)}
                onEscolher={async (ex) => {
                  await repo.addItem(id, ex.id);
                  app.mudou();
                  app.toast(`${ex.nome} adicionado`);
                }}
              />,
            )
          }
        >
          <Icon name="mais" size={20} /> Adicionar exercício
        </button>

        {ficha.modelo_origem_id ? (
          <button className="btn ghost full" onClick={() => app.abrirSheet(<ConfirmarRestaurar ficha={ficha} />)}>
            <Icon name="restaurar" size={18} /> Restaurar sugestão original
          </button>
        ) : null}
      </div>
    </>
  );
}

function ItemSheet({ item }) {
  const app = useApp();
  const [series, setSeries] = useState(Number(item.series));
  const [reps, setReps] = useState(item.repeticoes);
  const [carga, setCarga] = useState(item.carga_kg != null ? String(item.carga_kg).replace('.', ',') : '');
  const [obs, setObs] = useState(item.observacao || '');
  const [imagem, setImagem] = useState(item.imagem_url || null);
  const [ocupado, setOcupado] = useState(false);

  // A foto é do exercício: muda em todas as fichas e na biblioteca.
  async function trocarFoto(origem) {
    try {
      setOcupado(true);
      const caminho = await novaFoto(origem);
      if (!caminho) return;
      await repo.setImagemExercicio(item.exercicio_id, caminho);
      await apagarFoto(imagem);
      setImagem(caminho);
      app.mudou();
    } catch (e) {
      console.error(e);
      app.toast('Não foi possível usar a foto');
    } finally {
      setOcupado(false);
    }
  }

  async function salvar() {
    await repo.updateItem(item.id, {
      series,
      repeticoes: reps.trim() || '12',
      carga_kg: parseNum(carga),
      observacao: obs.trim(),
    });
    app.fecharSheet();
    app.mudou();
  }

  return (
    <Sheet
      title={item.nome}
      onClose={app.fecharSheet}
      footer={
        <div className="foot-row">
          <button
            className="btn danger ghost"
            onClick={async () => {
              await repo.removeItem(item.id);
              app.fecharSheet();
              app.mudou();
              app.toast('Exercício removido da ficha');
            }}
          >
            <Icon name="lixo" size={18} /> Remover
          </button>
          <button className="btn" onClick={salvar}>
            Salvar
          </button>
        </div>
      }
    >
      <div className="item-photo">
        <FotoGrande imagem={imagem} grupo={item.grupo_muscular} />
        <div className="item-photo-actions">
          <span className="row-sub">{item.grupo_muscular}</span>
          <button className="btn ghost small" disabled={ocupado} onClick={() => trocarFoto('camera')}>
            <Icon name="camera" size={18} /> Tirar foto
          </button>
          <button className="btn ghost small" disabled={ocupado} onClick={() => trocarFoto('galeria')}>
            <Icon name="galeria" size={18} /> Galeria
          </button>
        </div>
      </div>
      <div className="grid2">
        <label className="field">
          <span>Séries</span>
          <Stepper value={series} min={1} max={10} onChange={setSeries} />
        </label>
        <label className="field">
          <span>Repetições</span>
          <input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="12 ou 8-10" />
        </label>
      </div>
      <label className="field">
        <span>Carga atual (kg)</span>
        <input inputMode="decimal" value={carga} onChange={(e) => setCarga(e.target.value)} placeholder="Ex.: 20" />
      </label>
      <label className="field">
        <span>Observação</span>
        <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: banco no 3º furo, pegada fechada" />
      </label>
    </Sheet>
  );
}

function FotoGrande({ imagem, grupo }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let vivo = true;
    setSrc(null);
    if (imagem) srcDaImagem(imagem).then((x) => vivo && setSrc(x)).catch(() => {});
    return () => {
      vivo = false;
    };
  }, [imagem]);
  if (src) return <img className="photo-big" src={src} alt="" />;
  return <Thumb imagem={null} grupo={grupo} size={120} />;
}

function MenuFicha({ ficha }) {
  const app = useApp();
  const [renomear, setRenomear] = useState(false);
  const [nome, setNome] = useState(ficha.nome);
  const [excluir, setExcluir] = useState(false);

  if (renomear) {
    return (
      <Sheet
        title="Renomear ficha"
        onClose={app.fecharSheet}
        footer={
          <button
            className="btn full"
            disabled={!nome.trim()}
            onClick={async () => {
              await repo.renomearFicha(ficha.id, nome.trim());
              app.fecharSheet();
              app.mudou();
            }}
          >
            Salvar
          </button>
        }
      >
        <label className="field">
          <span>Nome</span>
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
      </Sheet>
    );
  }

  if (excluir) {
    return (
      <Sheet
        title="Excluir ficha?"
        onClose={app.fecharSheet}
        footer={
          <div className="foot-row">
            <button className="btn ghost" onClick={app.fecharSheet}>
              Cancelar
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                await repo.excluirFicha(ficha.id);
                await repo.redistribuirFila();
                app.fecharSheet();
                app.voltar();
                app.mudou();
                app.toast('Ficha excluída');
              }}
            >
              Excluir
            </button>
          </div>
        }
      >
        <p>
          <b>{ficha.nome}</b> e os {ficha.itens.length} exercícios dela vão sumir. Os exercícios continuam na biblioteca. Isso não pode ser desfeito.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet title={ficha.nome} onClose={app.fecharSheet}>
      <div className="menu">
        <button onClick={() => setRenomear(true)}>
          <Icon name="editar" /> Renomear
        </button>
        <button
          onClick={async () => {
            await repo.setFichaAtiva(ficha.id, !ficha.ativa);
            await repo.redistribuirFila();
            app.fecharSheet();
            app.mudou();
            app.toast(ficha.ativa ? 'Ficha tirada da fila' : 'Ficha de volta na fila');
          }}
        >
          <Icon name="fila" /> {ficha.ativa ? 'Tirar da fila de treinos' : 'Colocar de volta na fila'}
        </button>
        <button className="danger" onClick={() => setExcluir(true)}>
          <Icon name="lixo" /> Excluir ficha
        </button>
      </div>
    </Sheet>
  );
}

function ConfirmarRestaurar({ ficha }) {
  const app = useApp();
  return (
    <Sheet
      title="Restaurar sugestão original?"
      onClose={app.fecharSheet}
      footer={
        <div className="foot-row">
          <button className="btn ghost" onClick={app.fecharSheet}>
            Cancelar
          </button>
          <button
            className="btn"
            onClick={async () => {
              await repo.restaurarSugestao(ficha.id);
              app.fecharSheet();
              app.mudou();
              app.toast('Ficha restaurada');
            }}
          >
            Restaurar
          </button>
        </div>
      }
    >
      <p>Os exercícios voltam a ser os do modelo sugerido. Cargas e observações desta ficha serão apagadas.</p>
    </Sheet>
  );
}

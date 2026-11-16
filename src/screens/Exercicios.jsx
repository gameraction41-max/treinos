import { useState } from 'react';
import { Icon, Sheet, Thumb, Empty, useApp, useLoad } from '../components/ui.jsx';
import * as repo from '../db/repo.js';
import { GRUPOS } from '../db/seed.js';
import { novaFoto, apagarFoto } from '../lib/imagens.js';

function Filtros({ busca, setBusca, grupo, setGrupo }) {
  return (
    <div className="filters">
      <label className="search">
        <Icon name="busca" size={18} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício" aria-label="Buscar exercício" />
        {busca && (
          <button className="icon-btn sm" aria-label="Limpar busca" onClick={() => setBusca('')}>
            <Icon name="fechar" size={16} />
          </button>
        )}
      </label>
      <div className="chips-scroll">
        <button className={`chip-btn ${!grupo ? 'on' : ''}`} onClick={() => setGrupo('')}>
          Todos
        </button>
        {GRUPOS.map((g) => (
          <button key={g} className={`chip-btn ${grupo === g ? 'on' : ''}`} onClick={() => setGrupo(grupo === g ? '' : g)}>
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}

function ListaExercicios({ lista, onClick, marcados = [] }) {
  if (!lista.length) return <Empty title="Nenhum exercício encontrado">Tente outra busca ou cadastre um novo.</Empty>;
  return (
    <ul className="list exercises">
      {lista.map((ex) => (
        <li key={ex.id} className="row">
          <button className="row-main" onClick={() => onClick(ex)}>
            <Thumb imagem={ex.imagem_url} grupo={ex.grupo_muscular} size={48} />
            <span className="row-text">
              <span className="row-title">{ex.nome}</span>
              <span className="row-sub">
                {ex.grupo_muscular}
                {!ex.padrao ? ' · seu' : ''}
              </span>
            </span>
            {marcados.includes(ex.id) && (
              <span className="in-ficha">
                <Icon name="check" size={18} />
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Exercicios() {
  const app = useApp();
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('');
  const [lista] = useLoad(() => repo.listExercicios({ busca, grupo }), [busca, grupo]);

  return (
    <div className="stack">
      <Filtros busca={busca} setBusca={setBusca} grupo={grupo} setGrupo={setGrupo} />
      {lista && <ListaExercicios lista={lista} onClick={(ex) => app.abrirSheet(<ExercicioForm exercicio={ex} />)} />}
      <button className="fab" aria-label="Novo exercício" onClick={() => app.abrirSheet(<ExercicioForm grupoInicial={grupo} />)}>
        <Icon name="mais" size={26} />
      </button>
    </div>
  );
}

// Folha para escolher exercícios da biblioteca e adicionar à ficha.
export function SeletorExercicios({ jaNaFicha = [], onEscolher }) {
  const app = useApp();
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('');
  const [adicionados, setAdicionados] = useState(jaNaFicha);
  const [lista] = useLoad(() => repo.listExercicios({ busca, grupo }), [busca, grupo]);

  return (
    <Sheet
      title="Adicionar exercício"
      onClose={app.fecharSheet}
      footer={
        <button className="btn full" onClick={app.fecharSheet}>
          Pronto
        </button>
      }
    >
      <Filtros busca={busca} setBusca={setBusca} grupo={grupo} setGrupo={setGrupo} />
      {lista && (
        <ListaExercicios
          lista={lista}
          marcados={adicionados}
          onClick={async (ex) => {
            await onEscolher(ex);
            setAdicionados((a) => [...a, ex.id]);
          }}
        />
      )}
    </Sheet>
  );
}

export function ExercicioForm({ exercicio, grupoInicial }) {
  const app = useApp();
  const [nome, setNome] = useState(exercicio?.nome || '');
  const [grupo, setGrupo] = useState(exercicio?.grupo_muscular || grupoInicial || GRUPOS[0]);
  const [imagem, setImagem] = useState(exercicio?.imagem_url || null);
  const [ocupado, setOcupado] = useState(false);
  const [podeExcluir] = useLoad(async () => (exercicio ? repo.podeExcluirExercicio(exercicio.id) : false), [exercicio?.id]);

  async function foto(origem) {
    try {
      setOcupado(true);
      const caminho = await novaFoto(origem);
      if (caminho) setImagem(caminho);
    } catch (e) {
      app.toast('Não foi possível usar a foto');
      console.error(e);
    } finally {
      setOcupado(false);
    }
  }

  async function salvar() {
    if (exercicio?.imagem_url && exercicio.imagem_url !== imagem) await apagarFoto(exercicio.imagem_url);
    await repo.saveExercicio({ id: exercicio?.id, nome: nome.trim(), grupo_muscular: grupo, imagem_url: imagem });
    app.fecharSheet();
    app.mudou();
    app.toast(exercicio ? 'Exercício atualizado' : 'Exercício cadastrado');
  }

  return (
    <Sheet
      title={exercicio ? 'Editar exercício' : 'Novo exercício'}
      onClose={app.fecharSheet}
      footer={
        <div className="foot-row">
          {podeExcluir ? (
            <button
              className="btn danger ghost"
              onClick={async () => {
                await apagarFoto(exercicio.imagem_url);
                await repo.deleteExercicio(exercicio.id);
                app.fecharSheet();
                app.mudou();
                app.toast('Exercício excluído');
              }}
            >
              <Icon name="lixo" size={18} /> Excluir
            </button>
          ) : (
            <span />
          )}
          <button className="btn" disabled={!nome.trim() || ocupado} onClick={salvar}>
            Salvar
          </button>
        </div>
      }
    >
      <div className="photo-edit">
        <Thumb imagem={imagem} grupo={grupo} size={96} />
        <div className="photo-actions">
          <button className="btn ghost small" disabled={ocupado} onClick={() => foto('camera')}>
            <Icon name="camera" size={18} /> Tirar foto
          </button>
          <button className="btn ghost small" disabled={ocupado} onClick={() => foto('galeria')}>
            <Icon name="galeria" size={18} /> Galeria
          </button>
          {imagem && (
            <button className="link danger" onClick={() => setImagem(null)}>
              Remover foto
            </button>
          )}
        </div>
      </div>
      <p className="hint small">Foto opcional. Sem foto, aparece o ícone do grupo muscular.</p>
      <label className="field">
        <span>Nome</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Remada cavalinho" />
      </label>
      <div className="field">
        <span>Grupo muscular</span>
        <div className="chips-wrap">
          {GRUPOS.map((g) => (
            <button key={g} className={`chip-btn ${grupo === g ? 'on' : ''}`} onClick={() => setGrupo(g)}>
              {g}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppCtx, Icon } from './components/ui.jsx';
import { getDb } from './db/connection.js';
import * as repo from './db/repo.js';
import { reagendar } from './lib/lembretes.js';
import Semana from './screens/Semana.jsx';
import Fichas from './screens/Fichas.jsx';
import FichaEditor from './screens/FichaEditor.jsx';
import Sugestoes from './screens/Sugestoes.jsx';
import Exercicios from './screens/Exercicios.jsx';
import Corpo from './screens/Corpo.jsx';
import Config from './screens/Config.jsx';
import Boasvindas from './screens/Boasvindas.jsx';

const ABAS = [
  { id: 'semana', label: 'Semana', icon: 'semana', titulo: 'Minha semana' },
  { id: 'fichas', label: 'Fichas', icon: 'fichas', titulo: 'Fichas' },
  { id: 'exercicios', label: 'Exercícios', icon: 'exercicios', titulo: 'Exercícios' },
  { id: 'corpo', label: 'Corpo', icon: 'corpo', titulo: 'Corpo' },
];

const TELAS = {
  semana: Semana,
  fichas: Fichas,
  exercicios: Exercicios,
  corpo: Corpo,
  config: Config,
  ficha: FichaEditor,
  sugestoes: Sugestoes,
};

// Permite abrir uma tela específica pela URL (#ficha:3), útil para prints.
function telaInicial() {
  const h = typeof location !== 'undefined' ? location.hash.slice(1) : '';
  const [tela, id] = h.split(':');
  if (ABAS.some((a) => a.id === tela)) return { aba: tela, pilha: [] };
  if (tela === 'config' || tela === 'sugestoes') return { aba: 'fichas', pilha: [{ tela }] };
  if (tela === 'ficha' && id) return { aba: 'fichas', pilha: [{ tela: 'ficha', id: Number(id) }] };
  return { aba: 'semana', pilha: [] };
}

export default function App() {
  const inicial = useRef(telaInicial()).current;
  const [pronto, setPronto] = useState(false);
  const [configurado, setConfigurado] = useState(true);
  const [erro, setErro] = useState(null);
  const [aba, setAba] = useState(inicial.aba);
  const [pilha, setPilha] = useState(inicial.pilha);
  const [sheet, setSheet] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [versao, setVersao] = useState(0);
  const estado = useRef({});
  estado.current = { sheet, pilha, aba };

  const [etapa, setEtapa] = useState('Abrindo o banco de dados');
  const [demorando, setDemorando] = useState(false);

  useEffect(() => {
    // Se a abertura travar, mostra em que etapa parou em vez de ficar em "Carregando…".
    const t = setTimeout(() => setDemorando(true), 15000);
    (async () => {
      try {
        setEtapa('Abrindo o banco de dados');
        await getDb();
        setEtapa('Lendo o seu perfil');
        const perfil = await repo.getPerfil();
        setConfigurado(!!perfil.configurado);
        setPronto(true);
        clearTimeout(t);
        // Lembretes em segundo plano: nunca seguram a abertura do app.
        if (perfil.configurado) reagendar().catch(console.error);
      } catch (e) {
        console.error(e);
        clearTimeout(t);
        setErro(String(e?.message || e));
      }
    })();
    return () => clearTimeout(t);
  }, []);

  const mudou = useCallback(() => {
    setVersao((v) => v + 1);
    reagendar().catch(console.error);
  }, []);

  const toast = useCallback((msg) => {
    setAviso(msg);
    clearTimeout(estado.current.t);
    estado.current.t = setTimeout(() => setAviso(null), 2600);
  }, []);

  const ir = useCallback((tela, params = {}) => setPilha((p) => [...p, { tela, ...params }]), []);
  const voltar = useCallback(() => setPilha((p) => p.slice(0, -1)), []);
  const abrirSheet = useCallback((el) => setSheet(el), []);
  const fecharSheet = useCallback(() => setSheet(null), []);
  const trocarAba = useCallback((id) => {
    setPilha([]);
    setAba(id);
  }, []);

  // Botão voltar do Android: fecha a folha, volta uma tela, volta para Semana ou sai.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle;
    import('@capacitor/app').then(({ App: CapApp }) => {
      handle = CapApp.addListener('backButton', () => {
        const { sheet: s, pilha: p, aba: a } = estado.current;
        if (s) setSheet(null);
        else if (p.length) setPilha(p.slice(0, -1));
        else if (a !== 'semana') setAba('semana');
        else CapApp.minimizeApp();
      });
      // Ao voltar para o app num dia novo, recarrega a semana e os lembretes.
      CapApp.addListener('resume', () => mudou());
    });
    return () => {
      handle?.then?.((h) => h.remove());
    };
  }, [mudou]);

  const ctx = { versao, mudou, ir, voltar, abrirSheet, fecharSheet, toast, trocarAba };

  if (erro) {
    return (
      <div className="boot">
        <strong>Não consegui abrir o app.</strong>
        <p>
          Etapa: {etapa}
          <br />
          {erro}
        </p>
        <button className="btn" onClick={() => location.reload()}>
          Tentar de novo
        </button>
      </div>
    );
  }
  if (!pronto) {
    return (
      <div className="boot">
        <span>Carregando…</span>
        {demorando && (
          <>
            <p>Está demorando mais que o normal ({etapa.toLowerCase()}).</p>
            <button className="btn" onClick={() => location.reload()}>
              Tentar de novo
            </button>
          </>
        )}
      </div>
    );
  }

  if (!configurado) {
    return (
      <AppCtx.Provider value={ctx}>
        <Boasvindas
          onPronto={() => {
            setConfigurado(true);
            mudou();
          }}
        />
        {sheet}
      </AppCtx.Provider>
    );
  }

  const topo = pilha[pilha.length - 1];
  const Tela = TELAS[topo ? topo.tela : aba];
  const abaInfo = ABAS.find((a) => a.id === aba);

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        {!topo && (
          <header className="topbar">
            <h1>{abaInfo.titulo}</h1>
            <button className="icon-btn" aria-label="Configurações" onClick={() => ir('config')}>
              <Icon name="config" />
            </button>
          </header>
        )}
        <main className={`content ${topo ? 'pushed' : ''}`} key={topo ? `${topo.tela}-${topo.id ?? ''}` : aba}>
          <Tela {...(topo || {})} />
        </main>
        <nav className="tabbar">
          {ABAS.map((a) => (
            <button key={a.id} className={aba === a.id && !topo ? 'on' : aba === a.id ? 'on-dim' : ''} onClick={() => trocarAba(a.id)}>
              <Icon name={a.icon} />
              <span>{a.label}</span>
            </button>
          ))}
        </nav>
      </div>
      {sheet}
      {aviso && <div className="toast">{aviso}</div>}
    </AppCtx.Provider>
  );
}

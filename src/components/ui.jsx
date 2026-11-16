import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { srcDaImagem } from '../lib/imagens.js';

// ---------- Ícones (traço, 24×24) ----------
const PATHS = {
  semana: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 12h2M8 16h2M14 12h2M14 16h2',
  fichas: 'M9 5h10M9 12h10M9 19h10M4.5 5h.01M4.5 12h.01M4.5 19h.01',
  exercicios: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  corpo: 'M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 9l7 1.5L19 9M12 10.5V15M9 21l3-6 3 6',
  config:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  voltar: 'M15 18l-6-6 6-6',
  mais: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cima: 'M6 15l6-6 6 6',
  baixo: 'M6 9l6 6 6-6',
  lixo: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  galeria: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  editar: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  mais_opcoes: 'M12 6h.01M12 12h.01M12 18h.01',
  esq: 'M15 18l-6-6 6-6',
  dir: 'M9 6l6 6-6 6',
  sino: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0',
  restaurar: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  fila: 'M4 7h12M4 12h12M4 17h7M18 14v6M15 17h6',
  fechar: 'M6 6l12 12M18 6L6 18',
  estrela: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
};

export function Icon({ name, size = 22, stroke = 2, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

// ---------- Grupo muscular ----------
export const CORES_GRUPO = {
  Peito: '#E0605E',
  Costas: '#4F7FD9',
  Ombros: '#E39A3B',
  Bíceps: '#9A6BD8',
  Tríceps: '#C65BA6',
  Quadríceps: '#2E9C78',
  Posterior: '#3F9FAE',
  Glúteos: '#D8708E',
  Panturrilha: '#7E9A3A',
  Abdômen: '#8A7B6B',
};

const SIGLA = {
  Peito: 'PE',
  Costas: 'CO',
  Ombros: 'OM',
  Bíceps: 'BI',
  Tríceps: 'TR',
  Quadríceps: 'QU',
  Posterior: 'PO',
  Glúteos: 'GL',
  Panturrilha: 'PA',
  Abdômen: 'AB',
};

export function GrupoIcon({ grupo, size = 48, radius }) {
  const cor = CORES_GRUPO[grupo] || '#888';
  return (
    <div
      className="grupo-icon"
      style={{ width: size, height: size, borderRadius: radius ?? Math.round(size / 4), background: `${cor}24`, color: cor, fontSize: Math.round(size * 0.34) }}
      title={grupo}
    >
      {SIGLA[grupo] || '?'}
    </div>
  );
}

export function Thumb({ imagem, grupo, size = 48 }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let vivo = true;
    setSrc(null);
    if (imagem) srcDaImagem(imagem).then((s) => vivo && setSrc(s)).catch(() => {});
    return () => {
      vivo = false;
    };
  }, [imagem]);
  if (src) return <img className="thumb" src={src} alt="" style={{ width: size, height: size }} />;
  return <GrupoIcon grupo={grupo} size={size} />;
}

// ---------- Folha inferior (bottom sheet) ----------
export function Sheet({ title, onClose, children, footer }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && (
          <div className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
              <Icon name="fechar" />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, min = 0, max = 99, onChange, sufixo = '' }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Menos">
        −
      </button>
      <span>
        {value}
        {sufixo}
      </span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Mais">
        +
      </button>
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// ---------- Contexto do app: navegação, folhas e avisos ----------
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// Carrega dados assíncronos e recarrega quando algo muda no app.
export function useLoad(fn, deps = []) {
  const { versao } = useApp();
  const [data, setData] = useState(null);
  const [erro, setErro] = useState(null);
  const reload = useCallback(() => {
    let vivo = true;
    fn()
      .then((d) => vivo && setData(d))
      .catch((e) => {
        console.error(e);
        if (vivo) setErro(e);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao]);
  useEffect(reload, [reload]);
  return [data, erro];
}

export function fmtNum(n, casas = 1) {
  if (n == null || n === '') return '';
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: casas });
}

export function parseNum(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function PageHeader({ title, onBack, actions }) {
  const app = useApp();
  return (
    <header className="topbar pushed">
      <button className="icon-btn" aria-label="Voltar" onClick={onBack || app.voltar}>
        <Icon name="voltar" />
      </button>
      <h1>{title}</h1>
      <div className="topbar-actions">{actions}</div>
    </header>
  );
}

export const NIVEIS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

export const nomeNivel = (n) => NIVEIS.find((x) => x.value === n)?.label || n;

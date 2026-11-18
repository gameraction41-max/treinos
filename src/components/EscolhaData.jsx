import { useState } from 'react';
import { today, weekStart, addDays, fmtDiaMes, parse, DIAS_CURTOS } from '../lib/dates.js';

// "Hoje", "Próxima segunda" ou outra data (nunca antes de hoje).
export function EscolhaData({ valor, onChange }) {
  const hoje = today();
  const segunda = addDays(weekStart(hoje), 7);
  const [outra, setOutra] = useState(valor !== hoje && valor !== segunda);
  const rotulo = (d) => `${DIAS_CURTOS[parse(d).getDay()].toLowerCase()}, ${fmtDiaMes(d)}`;
  return (
    <div className="escolha-data">
      <div className="options compact">
        <button
          className={`option ${!outra && valor === hoje ? 'on' : ''}`}
          onClick={() => {
            setOutra(false);
            onChange(hoje);
          }}
        >
          <span className="radio" />
          <span>
            <span className="option-title">Hoje</span>
            <span className="option-sub">{rotulo(hoje)}</span>
          </span>
        </button>
        <button
          className={`option ${!outra && valor === segunda ? 'on' : ''}`}
          onClick={() => {
            setOutra(false);
            onChange(segunda);
          }}
        >
          <span className="radio" />
          <span>
            <span className="option-title">Próxima segunda</span>
            <span className="option-sub">{rotulo(segunda)}</span>
          </span>
        </button>
        <button className={`option ${outra ? 'on' : ''}`} onClick={() => setOutra(true)}>
          <span className="radio" />
          <span>
            <span className="option-title">Outra data</span>
            {outra && <span className="option-sub">{rotulo(valor)}</span>}
          </span>
        </button>
      </div>
      {outra && (
        <input
          type="date"
          className="date-input"
          min={hoje}
          value={valor}
          onChange={(e) => e.target.value && onChange(e.target.value < hoje ? hoje : e.target.value)}
        />
      )}
    </div>
  );
}

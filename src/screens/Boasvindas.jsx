import { useEffect, useState } from 'react';
import { Icon, Stepper, Thumb, NIVEIS, useApp, parseNum, fmtNum } from '../components/ui.jsx';
import { DIAS_LONGOS, DIAS_CURTOS, today } from '../lib/dates.js';
import * as repo from '../db/repo.js';
import { divisaoSugerida, imc, classificarImc, ordenarDias, ORDEM_SEMANA } from '../lib/planner.js';
import { pedirPermissao } from '../lib/lembretes.js';
import { EscolhaData } from '../components/EscolhaData.jsx';

const DESC_NIVEL = {
  iniciante: 'Treino há pouco tempo ou estou voltando agora.',
  intermediario: 'Treino com regularidade há alguns meses e conheço os exercícios.',
  avancado: 'Treino há anos, com bastante volume e divisão por grupo muscular.',
};

const PASSOS = ['Início', 'Você', 'Semana', 'Fichas', 'Lembretes'];

// Primeira abertura: um passo a passo curto para montar a primeira semana.
export default function Boasvindas({ onPronto }) {
  const app = useApp();
  const [passo, setPasso] = useState(0);
  const [nivel, setNivel] = useState('iniciante');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [meta, setMeta] = useState(4);
  const [temFixa, setTemFixa] = useState(false);
  const [nomeFixa, setNomeFixa] = useState('');
  const [diasFixa, setDiasFixa] = useState([]);
  const [diasTreino, setDiasTreino] = useState([]);
  const [comeco, setComeco] = useState(today());
  const [hora, setHora] = useState('07:00');
  const [pesoDias, setPesoDias] = useState(15);
  const [sugestao, setSugestao] = useState(true);
  const [divisoes, setDivisoes] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const dvs = await repo.listDivisoes();
      for (const dv of dvs) for (const f of dv.fichas) f.itens = await repo.getModeloItens(f.id);
      setDivisoes(dvs);
    })().catch(console.error);
  }, []);

  const fixosAtivos = temFixa ? diasFixa : [];
  const qtdFixa = fixosAtivos.length;
  const precisa = Math.max(0, meta - qtdFixa); // dias de academia a escolher
  const diasAcademia = Math.max(1, precisa);
  const fixaIncompleta = temFixa && (!nomeFixa.trim() || !diasFixa.length);
  const alternarDia = (d) => setDiasFixa((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]));
  const alternarTreino = (d) =>
    setDiasTreino((v) => (v.includes(d) ? v.filter((x) => x !== d) : v.length < precisa ? [...v, d] : v));
  const faltam = precisa - diasTreino.length;

  // A meta nunca fica abaixo dos dias fixos, e um dia não é academia e atividade fixa ao mesmo tempo.
  useEffect(() => {
    if (meta < qtdFixa) setMeta(Math.min(7, qtdFixa));
  }, [meta, qtdFixa]);
  useEffect(() => {
    setDiasTreino((v) => {
      const ok = v.filter((d) => !fixosAtivos.includes(d)).slice(0, precisa);
      return ok.length === v.length ? v : ok;
    });
  }, [precisa, fixosAtivos.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const dv = divisaoSugerida(divisoes, nivel, diasAcademia);
  const vAltura = parseNum(altura);
  const vPeso = parseNum(peso);
  const alturaOk = !altura || (vAltura > 80 && vAltura < 250);
  const pesoOk = !peso || (vPeso > 20 && vPeso < 400);
  const valorImc = alturaOk && pesoOk ? imc(vPeso, vAltura) : null;

  const podeAvancar = [true, alturaOk && pesoOk, !fixaIncompleta && faltam === 0, true, true][passo];

  async function concluir() {
    setSalvando(true);
    try {
      await repo.savePerfil({
        nivel,
        meta_semanal: meta,
        dias_academia: ordenarDias(diasTreino).join(','),
        data_inicio: comeco,
        hora_lembrete: hora,
        lembrete_peso_dias: pesoDias,
        altura_cm: vAltura || null,
      });
      if (vPeso) await repo.addPeso(today(), vPeso);
      for (const f of await repo.getDiasFixos()) await repo.removeDiaFixo(f.id);
      if (temFixa) for (const d of diasFixa) await repo.addDiaFixo(d, nomeFixa.trim());
      if (sugestao && dv) await repo.usarSugestao(dv.divisao);
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

  const avancar = () => (passo < PASSOS.length - 1 ? setPasso(passo + 1) : concluir());

  return (
    <div className="welcome wizard">
      {passo > 0 && (
        <div className="wizard-top">
          <button className="icon-btn" aria-label="Voltar" onClick={() => setPasso(passo - 1)}>
            <Icon name="voltar" />
          </button>
          <div className="wizard-dots" aria-label={`Passo ${passo} de ${PASSOS.length - 1}`}>
            {PASSOS.slice(1).map((p, i) => (
              <span key={p} className={i + 1 <= passo ? 'on' : ''} />
            ))}
          </div>
          <span className="wizard-count">
            {passo}/{PASSOS.length - 1}
          </span>
        </div>
      )}

      <div className="wizard-body" key={passo}>
        {passo === 0 && (
          <div className="intro">
            <div className="logo big" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
              </svg>
            </div>
            <h1>Treinos</h1>
            <p className="intro-lead">Saiba quando e o que treinar em cada dia da semana.</p>
            <ul className="features">
              <li>
                <span className="feature-icon">
                  <Icon name="semana" />
                </span>
                <span>
                  <strong>Sua semana planejada</strong>
                  <span>Meta de treinos, dias de academia espalhados e atividade fixa, como Pilates.</span>
                </span>
              </li>
              <li>
                <span className="feature-icon">
                  <Icon name="fichas" />
                </span>
                <span>
                  <strong>Fichas que se revezam</strong>
                  <span>Treino A, B, C… em fila. Perdeu um dia? A fila continua de onde parou.</span>
                </span>
              </li>
              <li>
                <span className="feature-icon">
                  <Icon name="corpo" />
                </span>
                <span>
                  <strong>Peso, IMC e evolução</strong>
                  <span>Registre o peso de tempos em tempos e veja o gráfico.</span>
                </span>
              </li>
              <li>
                <span className="feature-icon">
                  <Icon name="sino" />
                </span>
                <span>
                  <strong>Lembretes no celular</strong>
                  <span>Aviso no dia do treino, da meta e da hora de se pesar.</span>
                </span>
              </li>
            </ul>
            <p className="hint small center">Tudo fica só neste celular: sem conta e sem internet.</p>
          </div>
        )}

        {passo === 1 && (
          <>
            <Titulo t="Sobre você" s="Usamos o nível para sugerir as fichas certas." />
            <div className="level-cards" role="radiogroup">
              {NIVEIS.map((n) => (
                <button key={n.value} role="radio" aria-checked={nivel === n.value} className={`level-card ${nivel === n.value ? 'on' : ''}`} onClick={() => setNivel(n.value)}>
                  <span className="radio" />
                  <span>
                    <strong>{n.label}</strong>
                    <span>{DESC_NIVEL[n.value]}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="grid2">
              <label className="field">
                <span>Altura (cm)</span>
                <input inputMode="numeric" value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="Ex.: 175" />
              </label>
              <label className="field">
                <span>Peso (kg)</span>
                <input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex.: 78,5" />
              </label>
            </div>
            {valorImc ? (
              <div className="note ok">
                IMC {fmtNum(valorImc)} · {classificarImc(valorImc)}
              </div>
            ) : (
              <p className="hint small">Opcional. Com altura e peso, o app calcula seu IMC e começa o gráfico de evolução.</p>
            )}
          </>
        )}

        {passo === 2 && (
          <>
            <Titulo t="Sua semana" s="Quantos treinos você quer fazer por semana?" />
            <section className="card settings">
              <div className="setting">
                <div>
                  <strong>Treinos por semana</strong>
                  <span className="row-sub">{temFixa ? 'Contando a atividade fixa' : 'Academia e outras atividades'}</span>
                </div>
                <Stepper value={meta} min={Math.max(1, qtdFixa)} max={7} onChange={setMeta} />
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
            </section>
            <section className="card settings">
              <div className="setting column">
                <div className="dias-head">
                  <div>
                    <strong>Em quais dias você vai à academia?</strong>
                    <span className="row-sub">
                      {precisa === 0
                        ? 'Sua meta já fecha com a atividade fixa.'
                        : faltam > 0
                          ? `Escolha mais ${faltam} dia${faltam > 1 ? 's' : ''}`
                          : 'Pronto! Para trocar, desmarque um dia.'}
                    </span>
                  </div>
                  {precisa > 0 && (
                    <span className={`contador ${faltam === 0 ? 'ok' : ''}`}>
                      {diasTreino.length}/{precisa}
                    </span>
                  )}
                </div>
                <div className="dias-grid" role="group" aria-label="Dias de academia">
                  {ORDEM_SEMANA.map((d) => {
                    const fixo = fixosAtivos.includes(d);
                    const on = diasTreino.includes(d);
                    const cheio = !on && diasTreino.length >= precisa;
                    return (
                      <button
                        key={d}
                        aria-pressed={on}
                        aria-label={DIAS_LONGOS[d]}
                        className={`dia-btn ${on ? 'on' : ''} ${fixo ? 'fixo' : ''}`}
                        disabled={fixo || cheio}
                        onClick={() => alternarTreino(d)}
                      >
                        <span>{DIAS_CURTOS[d]}</span>
                        <small>{fixo ? (nomeFixa.trim() || 'Fixa').slice(0, 7) : on ? 'Treino' : ''}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
            <section className="card settings">
              <div className="setting column">
                <div>
                  <strong>Quando você começa?</strong>
                  <span className="row-sub">Antes dessa data a semana fica livre, sem treinos nem lembretes.</span>
                </div>
                <EscolhaData valor={comeco} onChange={setComeco} />
              </div>
            </section>
            <div className="week-preview">
              <span className="big">{meta}</span>
              <span>
                treino{meta > 1 ? 's' : ''} por semana: {precisa} de academia
                {qtdFixa > 0 && nomeFixa.trim() ? ` + ${nomeFixa.trim()} (${qtdFixa}x)` : ''}
              </span>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <Titulo t="Suas fichas" s="Uma sugestão pronta para começar. Depois você edita como quiser." />
            {dv && (
              <section className={`card model ${sugestao ? 'highlight' : ''}`}>
                <div className="model-head">
                  <span className="chip accent">Recomendado para você</span>
                  <strong>{dv.divisao}</strong>
                  <span className="row-sub">
                    {dv.fichas.length} fichas que se revezam em {diasAcademia} dia{diasAcademia > 1 ? 's' : ''} de academia
                  </span>
                </div>
                {dv.fichas.map((f) => (
                  <div key={f.id} className="model-ficha">
                    <strong>{f.nome}</strong>
                    <div className="thumb-row">
                      {(f.itens || []).slice(0, 6).map((it) => (
                        <Thumb key={it.id} imagem={it.imagem_url} grupo={it.grupo_muscular} size={40} />
                      ))}
                      {(f.itens || []).length > 6 && <span className="more">+{f.itens.length - 6}</span>}
                    </div>
                  </div>
                ))}
              </section>
            )}
            <div className="options">
              <button className={`option ${sugestao ? 'on' : ''}`} onClick={() => setSugestao(true)}>
                <span className="radio" />
                <span>
                  <span className="option-title">Usar esta sugestão</span>
                  <span className="option-sub">As fichas já entram na sua fila</span>
                </span>
              </button>
              <button className={`option ${!sugestao ? 'on' : ''}`} onClick={() => setSugestao(false)}>
                <span className="radio" />
                <span>
                  <span className="option-title">Montar minhas fichas depois</span>
                  <span className="option-sub">Na aba Fichas, do zero ou a partir de outra sugestão</span>
                </span>
              </button>
            </div>
            <p className="hint small">Os modelos são genéricos. Se tiver alguma limitação física, vale pedir a um professor para revisar.</p>
          </>
        )}

        {passo === 4 && (
          <>
            <Titulo t="Lembretes" s="Avisos no próprio celular, sem internet." />
            <section className="card settings">
              <div className="setting">
                <div>
                  <strong>Horário dos avisos</strong>
                  <span className="row-sub">Nos dias de treino{temFixa ? ' e da atividade fixa' : ''}</span>
                </div>
                <input type="time" className="time" value={hora} onChange={(e) => e.target.value && setHora(e.target.value)} />
              </div>
              <div className="setting column">
                <strong>Lembrar de atualizar o peso</strong>
                <div className="segmented">
                  {[15, 30].map((v) => (
                    <button key={v} className={pesoDias === v ? 'on' : ''} onClick={() => setPesoDias(v)}>
                      A cada {v} dias
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <ul className="reminder-list">
              <li>
                <Icon name="sino" size={18} /> “Hoje: Treino A” às {hora} nos dias de treino
              </li>
              <li>
                <Icon name="sino" size={18} /> Na quinta, se faltar mais de um treino para a meta
              </li>
              <li>
                <Icon name="sino" size={18} /> “Hora de atualizar seu peso” a cada {pesoDias} dias
              </li>
            </ul>
            <p className="hint small">Ao concluir, o Android vai pedir permissão para mostrar notificações.</p>
          </>
        )}
      </div>

      <div className="wizard-foot">
        <button className="btn full big" disabled={!podeAvancar || salvando} onClick={avancar}>
          {passo === 0 ? 'Vamos começar' : passo === PASSOS.length - 1 ? 'Concluir e ver minha semana' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}

function Titulo({ t, s }) {
  return (
    <div className="wizard-title">
      <h1>{t}</h1>
      <p>{s}</p>
    </div>
  );
}

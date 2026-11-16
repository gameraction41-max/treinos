// Datas sempre no fuso do celular, guardadas como 'AAAA-MM-DD'.

export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today() {
  return iso(new Date());
}

export function addDays(s, n) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

// Semana de segunda a domingo.
export function weekStart(s) {
  const d = parse(s);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return iso(d);
}

export function weekDays(start) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekday(s) {
  return parse(s).getDay();
}

export function daysBetween(a, b) {
  return Math.round((parse(b) - parse(a)) / 86400000);
}

export function fmtDiaMes(s) {
  const d = parse(s);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function fmtData(s) {
  const d = parse(s);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function fmtSemana(start) {
  const end = addDays(start, 6);
  return `${fmtDiaMes(start)} – ${fmtDiaMes(end)}`;
}

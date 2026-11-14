import { formatarData } from './formatar-data';

// As datas chegam da API em UTC (ISO 8601) e aparecem no horario do aparelho. Para o teste nao
// depender do fuso da maquina, a entrada e montada a partir de uma data LOCAL.
const iso = (ano: number, mes: number, dia: number, hora = 0, minuto = 0) =>
  new Date(ano, mes - 1, dia, hora, minuto).toISOString();

describe('formatarData', () => {
  it('mostra dia/mes/ano e hora:minuto, com zero a esquerda', () => {
    expect(formatarData(iso(2026, 11, 3, 9, 5))).toBe('03/11/2026 às 09:05');
  });

  it('virada do dia: meia-noite e 00:00', () => {
    expect(formatarData(iso(2026, 1, 1, 0, 0))).toBe('01/01/2026 às 00:00');
  });

  it('fim do dia: 23:59', () => {
    expect(formatarData(iso(2026, 12, 31, 23, 59))).toBe('31/12/2026 às 23:59');
  });

  it('texto que nao e data devolve vazio, em vez de "NaN/NaN"', () => {
    expect(formatarData('isso nao e uma data')).toBe('');
    expect(formatarData('')).toBe('');
  });
});

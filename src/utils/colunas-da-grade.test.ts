import { colunasDaGrade } from './colunas-da-grade';

describe('colunasDaGrade', () => {
  it('com letra normal, os atalhos ficam em duas colunas', () => {
    expect(colunasDaGrade(1)).toBe(2);
  });

  it('com letra um pouco maior ainda cabem duas colunas', () => {
    expect(colunasDaGrade(1.3)).toBe(2);
  });

  it('com letra muito grande, passa para uma coluna (palavras não quebram no meio)', () => {
    expect(colunasDaGrade(1.31)).toBe(1);
    expect(colunasDaGrade(2)).toBe(1);
  });

  it('escala inválida volta para duas colunas', () => {
    expect(colunasDaGrade(0)).toBe(2);
    expect(colunasDaGrade(Number.NaN)).toBe(2);
  });
});

// Quantas colunas a grade de atalhos da tela de Inicio usa. Com a letra do sistema muito grande
// (fontScale alto, ajuste de acessibilidade) o titulo nao cabe na metade da tela e as palavras
// quebram no meio ("Report/ar"); entao a grade passa para uma coluna. Descoberto no simulador com
// "accessibility-extra-large".

/** Acima desta escala de fonte, uma coluna so. */
const ESCALA_MAXIMA_DE_DUAS_COLUNAS = 1.3;

export function colunasDaGrade(escalaDaFonte: number): 1 | 2 {
  if (!(escalaDaFonte > ESCALA_MAXIMA_DE_DUAS_COLUNAS)) return 2;
  return 1;
}

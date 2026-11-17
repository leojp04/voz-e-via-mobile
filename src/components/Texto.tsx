// Texto padrao do app: o Text do React Native ja com a fonte Atkinson Hyperlegible normal.
// No React Native nao da para trocar a fonte do app inteiro de uma vez (Text.defaultProps nao
// existe mais no React 19), entao todo texto passa por aqui. Para negrito, a tela sobrescreve
// com fontFamily: fontes.familia.negrito (cada peso e uma familia, nao fontWeight).

import { Text, type TextProps } from 'react-native';

import { fontes } from '../theme';

// Limite de crescimento dos cabeçalhos quando a pessoa aumenta a letra do sistema (máximo do iOS:
// 310%). Um título de 32 pt vira ~99 pt e palavras como "reportes" quebram no meio ("report/es").
// 200% é o que a WCAG 1.4.4 pede e ainda cabe na largura. O texto comum não tem limite.
const ESCALA_MAXIMA_DO_CABECALHO = 2;

export function Texto({ style, maxFontSizeMultiplier, ...resto }: TextProps) {
  const ehCabecalho = resto.accessibilityRole === 'header';
  return (
    <Text
      {...resto}
      maxFontSizeMultiplier={
        maxFontSizeMultiplier ?? (ehCabecalho ? ESCALA_MAXIMA_DO_CABECALHO : undefined)
      }
      style={[{ fontFamily: fontes.familia.regular }, style]}
    />
  );
}

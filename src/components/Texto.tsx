// Texto padrao do app: o Text do React Native ja com a fonte Atkinson Hyperlegible normal.
// No React Native nao da para trocar a fonte do app inteiro de uma vez (Text.defaultProps nao
// existe mais no React 19), entao todo texto passa por aqui. Para negrito, a tela sobrescreve
// com fontFamily: fontes.familia.negrito (cada peso e uma familia, nao fontWeight).

import { Text, type TextProps } from 'react-native';

import { fontes } from '../theme';

export function Texto({ style, ...resto }: TextProps) {
  return <Text {...resto} style={[{ fontFamily: fontes.familia.regular }, style]} />;
}

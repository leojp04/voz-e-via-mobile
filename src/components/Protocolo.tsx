// Numero de protocolo do reporte (ex.: "VV-2026-000007"). E um codigo que a pessoa guarda e le em
// voz alta, entao nao pode ser partido em duas linhas. Com a letra do sistema muito grande ele
// ficava "VV-2026-00000/1"; agora fica numa linha so e a fonte encolhe o necessario para caber.

import type { TextStyle, StyleProp } from 'react-native';

import { Texto } from './Texto';

/** Quanto a fonte pode encolher (50%) antes de o codigo deixar de caber. */
const ESCALA_MINIMA = 0.5;

interface PropsProtocolo {
  valor: string;
  style?: StyleProp<TextStyle>;
}

export function Protocolo({ valor, style }: PropsProtocolo) {
  return (
    <Texto numberOfLines={1} adjustsFontSizeToFit minimumFontScale={ESCALA_MINIMA} style={style}>
      {valor}
    </Texto>
  );
}

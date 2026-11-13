// Botao padrao do app: area de toque de pelo menos 48 dp, contraste conferido no tema e
// estados de "carregando" e "desabilitado" avisados ao leitor de tela (VoiceOver/TalkBack).

import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ALVO_MINIMO, cores, espacos, fontes } from '../theme';
import { Texto } from './Texto';

type Variante = 'primario' | 'secundario' | 'perigo';

interface PropsBotao {
  titulo: string;
  onPress: () => void;
  /** Texto lido pelo leitor de tela; se faltar, usa o titulo. */
  rotulo?: string;
  variante?: Variante;
  /** Enquanto true, mostra o indicador e ignora toques (evita enviar o formulario duas vezes). */
  carregando?: boolean;
  desabilitado?: boolean;
  /** Versao alta, para as acoes principais da tela de Inicio (mais facil de acertar o toque). */
  grande?: boolean;
}

export function Botao({
  titulo,
  onPress,
  rotulo,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  grande = false,
}: PropsBotao) {
  const inativo = carregando || desabilitado;
  const corDoTexto = variante === 'secundario' ? cores.acao : cores.textoSobreAcao;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo ?? titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variante === 'primario' && styles.primario,
        variante === 'perigo' && styles.perigo,
        variante === 'secundario' && styles.secundario,
        grande && styles.grande,
        inativo && styles.inativo,
        pressed && styles.pressionado,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corDoTexto} />
      ) : (
        <Texto style={[styles.texto, { color: corDoTexto }]}>{titulo}</Texto>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: ALVO_MINIMO,
    minWidth: ALVO_MINIMO,
    paddingHorizontal: espacos.grande,
    paddingVertical: espacos.pequeno,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
  },
  primario: { backgroundColor: cores.acao, borderColor: cores.acao },
  perigo: { backgroundColor: cores.perigo, borderColor: cores.perigo },
  secundario: { backgroundColor: cores.fundo, borderColor: cores.acao },
  grande: { minHeight: 80 },
  inativo: { opacity: 0.6 },
  pressionado: { opacity: 0.85 },
  texto: { fontSize: fontes.botao, fontFamily: fontes.familia.negrito },
});

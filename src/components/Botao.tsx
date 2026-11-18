// Botao padrao do app: area de toque de pelo menos 48 dp, contraste conferido no tema e
// estados de "carregando" e "desabilitado" avisados ao leitor de tela (VoiceOver/TalkBack).

import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ALVO_MINIMO, cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import { Icone, type NomeDeIcone } from './Icone';
import { Texto } from './Texto';

type Variante = 'primario' | 'secundario' | 'perigo' | 'ajuda';

// Limite de crescimento do titulo quando o usuario aumenta a letra do sistema (maximo do iOS: 310%).
// A 310% palavras longas como "Privacidade" passam da largura do botao e quebram no meio.
// A 250% o texto ainda fica bem maior que o normal e cabe.
const ESCALA_MAXIMA_DO_TITULO = 2.5;

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
  /** Icone decorativo a esquerda do titulo (escondido do leitor de tela). */
  icone?: NomeDeIcone;
}

export function Botao({
  titulo,
  onPress,
  rotulo,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  grande = false,
  icone,
}: PropsBotao) {
  const inativo = carregando || desabilitado;
  const corDoTexto = variante === 'secundario' ? cores.acao : cores.textoSobreAcao;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo ?? titulo}
      accessibilityLanguage={IDIOMA_DO_APP}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variante === 'primario' && styles.primario,
        variante === 'perigo' && styles.perigo,
        variante === 'ajuda' && styles.ajuda,
        variante === 'secundario' && styles.secundario,
        grande && styles.grande,
        inativo && styles.inativo,
        pressed && styles.pressionado,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corDoTexto} />
      ) : (
        <View style={styles.conteudo}>
          {icone ? <Icone nome={icone} tamanho={24} cor={corDoTexto} /> : null}
          <Texto
            maxFontSizeMultiplier={ESCALA_MAXIMA_DO_TITULO}
            style={[styles.texto, { color: corDoTexto }]}
          >
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: ALVO_MINIMO,
    minWidth: ALVO_MINIMO,
    // Margem lateral menor que o normal: com letra grande o texto precisa de cada ponto de largura.
    paddingHorizontal: espacos.medio,
    paddingVertical: espacos.pequeno,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primario: { backgroundColor: cores.acao, borderColor: cores.acao },
  perigo: { backgroundColor: cores.perigo, borderColor: cores.perigo },
  ajuda: { backgroundColor: cores.ajuda, borderColor: cores.ajuda },
  secundario: { backgroundColor: cores.fundo, borderColor: cores.acao },
  grande: { minHeight: 80 },
  inativo: { opacity: 0.6 },
  pressionado: { opacity: 0.85 },
  // flexShrink + centralizado: o titulo quebra de linha ao lado do icone em vez de empurra-lo.
  texto: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: fontes.botao,
    fontFamily: fontes.familia.negrito,
  },
});

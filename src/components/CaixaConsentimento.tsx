// Caixa de selecao do consentimento (LGPD): nasce desmarcada e quem decide e o usuario.
// O link para a Politica de Privacidade fica FORA desta caixa, na tela, porque um botao dentro
// de outro botao confunde o leitor de tela.

import { Pressable, StyleSheet, View } from 'react-native';

import { ALVO_MINIMO, cores, espacos, fontes } from '../theme';
import { Texto } from './Texto';

interface PropsCaixaConsentimento {
  texto: string;
  marcada: boolean;
  aoAlternar: () => void;
  erro?: string | null;
}

export function CaixaConsentimento({ texto, marcada, aoAlternar, erro }: PropsCaixaConsentimento) {
  return (
    <View style={styles.grupo}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={texto}
        accessibilityState={{ checked: marcada }}
        onPress={aoAlternar}
        style={styles.linha}
      >
        <View style={[styles.caixa, marcada && styles.caixaMarcada]}>
          {marcada ? <Texto style={styles.marca}>✓</Texto> : null}
        </View>
        <Texto style={styles.texto}>{texto}</Texto>
      </Pressable>
      {erro ? (
        <Texto style={styles.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: espacos.pequeno / 2 },
  linha: {
    minHeight: ALVO_MINIMO,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.medio,
  },
  caixa: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: cores.borda,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
  caixaMarcada: { backgroundColor: cores.acao, borderColor: cores.acao },
  marca: {
    color: cores.textoSobreAcao,
    fontSize: fontes.rotulo,
    fontFamily: fontes.familia.negrito,
  },
  texto: { flex: 1, fontSize: fontes.corpo, color: cores.texto },
  erro: { fontSize: fontes.rotulo, color: cores.erro },
});

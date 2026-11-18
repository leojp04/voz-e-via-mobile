// Botao do microfone: o destaque da tela de Inicio, porque a voz e o produto. Circulo grande
// (muito acima dos 48 dp minimos) para quem tem pouca precisao no toque, com a dica "Toque e
// fale" escrita embaixo para quem enxerga.

import { Pressable, StyleSheet, View } from 'react-native';

import { cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import { Icone } from './Icone';
import { Texto } from './Texto';

const TAMANHO = 120;

interface PropsBotaoMicrofone {
  onPress: () => void;
  /** Verdadeiro enquanto o app escuta: o botao vira "Parar de ouvir" (o mesmo toque encerra). */
  ouvindo?: boolean;
}

export function BotaoMicrofone({ onPress, ouvindo = false }: PropsBotaoMicrofone) {
  return (
    <View style={styles.grupo}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ouvindo ? 'Parar de ouvir' : 'Falar com o assistente por voz'}
        accessibilityLanguage={IDIOMA_DO_APP}
        accessibilityState={{ busy: ouvindo }}
        onPress={onPress}
        style={({ pressed }) => [styles.circulo, pressed && styles.pressionado]}
      >
        <Icone nome={ouvindo ? 'stop' : 'mic'} tamanho={56} cor={cores.textoSobreAcao} />
      </Pressable>
      <Texto style={styles.dica} accessibilityLiveRegion="polite">
        {ouvindo ? 'Ouvindo… toque para parar' : 'Toque e fale'}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { alignItems: 'center', gap: espacos.pequeno, paddingVertical: espacos.pequeno },
  circulo: {
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: TAMANHO / 2,
    backgroundColor: cores.acao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressionado: { opacity: 0.85 },
  dica: { fontSize: fontes.subtitulo, fontFamily: fontes.familia.negrito, color: cores.acao },
});

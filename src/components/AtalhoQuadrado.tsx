// Atalho quadrado da tela de Inicio: icone grande e titulo curto sobre o fundo salvia. O titulo na
// tela e curto ("Contatos"); o rotulo falado pode ser a frase completa ("Contatos de emergencia").
// Altura minima de 104 dp, mais que o dobro do minimo de 48 dp.

import { Pressable, StyleSheet } from 'react-native';

import { cores, espacos, fontes } from '../theme';
import { Icone, type NomeDeIcone } from './Icone';
import { Texto } from './Texto';

interface PropsAtalhoQuadrado {
  titulo: string;
  /** Texto lido pelo leitor de tela; se faltar, usa o titulo. */
  rotulo?: string;
  icone: NomeDeIcone;
  onPress: () => void;
}

export function AtalhoQuadrado({ titulo, rotulo, icone, onPress }: PropsAtalhoQuadrado) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo ?? titulo}
      onPress={onPress}
      style={({ pressed }) => [styles.atalho, pressed && styles.pressionado]}
    >
      <Icone nome={icone} tamanho={32} cor={cores.acao} />
      <Texto style={styles.titulo}>{titulo}</Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  atalho: {
    // flex: 1 faz o atalho preencher a celula da grade, entao os dois da mesma linha ficam iguais.
    flex: 1,
    minHeight: 104,
    padding: espacos.medio,
    gap: espacos.pequeno,
    borderRadius: 16,
    backgroundColor: cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressionado: { opacity: 0.85 },
  titulo: {
    fontSize: fontes.rotulo,
    fontFamily: fontes.familia.negrito,
    color: cores.acao,
    textAlign: 'center',
  },
});

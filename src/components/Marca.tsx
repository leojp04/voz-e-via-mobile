// Marca do app: o logo (microfone com uma "via") e o nome, no topo de Login e Cadastro. O desenho
// e decorativo (o nome ao lado ja diz tudo), entao fica escondido do leitor de tela.

import { Image, StyleSheet, View } from 'react-native';

import { cores, espacos, fontes } from '../theme';
import { Texto } from './Texto';

export function Marca() {
  return (
    <View style={styles.linha}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Texto style={styles.nome}>Voz & Via</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espacos.pequeno },
  logo: { width: 48, height: 48, borderRadius: 12 },
  // flexShrink: com a letra do sistema no maximo o nome quebra de linha em vez de vazar da tela.
  nome: {
    flexShrink: 1,
    fontSize: fontes.subtitulo,
    fontFamily: fontes.familia.negrito,
    color: cores.acao,
  },
});

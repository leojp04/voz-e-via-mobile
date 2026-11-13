// Campo de texto padrao: rotulo sempre visivel (nao some ao digitar, como um placeholder),
// mesmo nome para o leitor de tela e mensagem de erro anunciada assim que aparece.

import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ALVO_MINIMO, cores, espacos, fontes } from '../theme';
import { Texto } from './Texto';

interface PropsCampoTexto {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  /** Mensagem a mostrar abaixo do campo; null/ausente = sem erro. */
  erro?: string | null;
  /** true = esconde o que e digitado (senha). */
  senha?: boolean;
  tipoTeclado?: TextInputProps['keyboardType'];
  autoCompletar?: TextInputProps['autoComplete'];
  autoCapitalizar?: TextInputProps['autoCapitalize'];
}

export function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  erro,
  senha = false,
  tipoTeclado,
  autoCompletar,
  autoCapitalizar = 'none',
}: PropsCampoTexto) {
  return (
    <View style={styles.grupo}>
      <Texto style={styles.rotulo}>{rotulo}</Texto>
      <TextInput
        accessibilityLabel={rotulo}
        value={valor}
        onChangeText={aoMudar}
        secureTextEntry={senha}
        keyboardType={tipoTeclado}
        autoComplete={autoCompletar}
        autoCapitalize={autoCapitalizar}
        autoCorrect={false}
        style={[styles.entrada, erro ? styles.entradaComErro : null]}
      />
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
  rotulo: { fontSize: fontes.rotulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  entrada: {
    minHeight: ALVO_MINIMO,
    paddingHorizontal: espacos.medio,
    borderWidth: 2,
    borderColor: cores.borda,
    borderRadius: 8,
    fontFamily: fontes.familia.regular,
    fontSize: fontes.corpo,
    color: cores.texto,
    backgroundColor: cores.fundo,
  },
  entradaComErro: { borderColor: cores.erro },
  erro: { fontSize: fontes.rotulo, color: cores.erro },
});

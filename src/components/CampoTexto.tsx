// Campo de texto padrao: rotulo sempre visivel (nao some ao digitar, como um placeholder),
// mesmo nome para o leitor de tela e mensagem de erro anunciada assim que aparece.

import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ALVO_MINIMO, cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import { useAnunciar } from '../utils/anunciar';
import { Texto } from './Texto';

// Limite de crescimento do rótulo na letra máxima do sistema (310%): a 310% um rótulo como
// "Medicamentos (opcional)" quebra no meio ("Medicamento/s"). 200% é o que a WCAG 1.4.4 pede.
const ESCALA_MAXIMA_DO_ROTULO = 2;

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
  /** true = varias linhas (ex.: descricao de um reporte); o cursor comeca no topo. */
  multilinha?: boolean;
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
  multilinha = false,
}: PropsCampoTexto) {
  useAnunciar(erro);
  return (
    <View style={styles.grupo}>
      <Texto maxFontSizeMultiplier={ESCALA_MAXIMA_DO_ROTULO} style={styles.rotulo}>
        {rotulo}
      </Texto>
      <TextInput
        accessibilityLabel={rotulo}
        accessibilityLanguage={IDIOMA_DO_APP}
        value={valor}
        onChangeText={aoMudar}
        secureTextEntry={senha}
        keyboardType={tipoTeclado}
        autoComplete={autoCompletar}
        autoCapitalize={autoCapitalizar}
        autoCorrect={false}
        multiline={multilinha}
        textAlignVertical={multilinha ? 'top' : undefined}
        style={[
          styles.entrada,
          multilinha ? styles.entradaMultilinha : null,
          erro ? styles.entradaComErro : null,
        ]}
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
  // Mais alto (com paddingVertical, para o texto nao encostar na borda) para caber varias linhas.
  entradaMultilinha: { minHeight: 120, paddingVertical: espacos.pequeno },
  entradaComErro: { borderColor: cores.erro },
  erro: { fontSize: fontes.rotulo, color: cores.erro },
});

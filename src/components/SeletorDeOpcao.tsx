// Escolha de UMA opcao entre poucas (categoria e urgencia do reporte). Cada opcao e um botao de
// radio grande (toque minimo de 48 dp) e a escolhida fica preenchida; o leitor de tela anuncia
// "selecionado". Funciona com texto ou numero como valor (ex.: id da categoria).

import { Pressable, StyleSheet, View } from 'react-native';

import { ALVO_MINIMO, cores, espacos, fontes } from '../theme';
import { Texto } from './Texto';

export interface OpcaoDoSeletor<T> {
  valor: T;
  titulo: string;
}

interface PropsSeletorDeOpcao<T extends string | number> {
  rotulo: string;
  opcoes: OpcaoDoSeletor<T>[];
  /** Valor escolhido; null = nenhuma escolha ainda. */
  valor: T | null;
  aoMudar: (valor: T) => void;
  /** Mensagem a mostrar abaixo das opcoes; null/ausente = sem erro. */
  erro?: string | null;
}

export function SeletorDeOpcao<T extends string | number>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  erro,
}: PropsSeletorDeOpcao<T>) {
  return (
    <View style={styles.grupo}>
      <Texto style={styles.rotulo}>{rotulo}</Texto>
      <View accessibilityRole="radiogroup" accessibilityLabel={rotulo} style={styles.opcoes}>
        {opcoes.map((opcao) => {
          const selecionada = opcao.valor === valor;
          return (
            <Pressable
              key={String(opcao.valor)}
              accessibilityRole="radio"
              accessibilityLabel={opcao.titulo}
              accessibilityState={{ selected: selecionada }}
              onPress={() => aoMudar(opcao.valor)}
              style={[styles.opcao, selecionada && styles.opcaoSelecionada]}
            >
              <Texto style={[styles.texto, selecionada && styles.textoSelecionado]}>
                {opcao.titulo}
              </Texto>
            </Pressable>
          );
        })}
      </View>
      {erro ? (
        <Texto style={styles.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: espacos.pequeno },
  rotulo: { fontSize: fontes.rotulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espacos.pequeno },
  opcao: {
    flexGrow: 1,
    minHeight: ALVO_MINIMO,
    paddingHorizontal: espacos.medio,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.acao,
    backgroundColor: cores.fundo,
  },
  opcaoSelecionada: { backgroundColor: cores.acao },
  texto: {
    fontSize: fontes.botao,
    fontFamily: fontes.familia.negrito,
    color: cores.acao,
    textAlign: 'center',
  },
  textoSelecionado: { color: cores.textoSobreAcao },
  erro: { fontSize: fontes.rotulo, color: cores.erro },
});

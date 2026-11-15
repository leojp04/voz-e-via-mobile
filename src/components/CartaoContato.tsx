// Cartao de um contato de emergencia na lista: apelido (como a pessoa chama), nome, telefone e
// prioridade, com o botao "Ligar" que abre o discador. O leitor de tela le o rotulo do botao
// com apelido e nome, para saber QUEM vai ser chamado.

import { StyleSheet, View } from 'react-native';

import type { Contato } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { formatarTelefone } from '../utils/formatar-telefone';
import { Botao } from './Botao';
import { Texto } from './Texto';

interface PropsCartaoContato {
  contato: Contato;
  aoLigar: () => void;
}

export function CartaoContato({ contato, aoLigar }: PropsCartaoContato) {
  return (
    <View style={styles.cartao}>
      <Texto style={styles.apelido}>{contato.apelido}</Texto>
      <Texto style={styles.nome}>{contato.nome}</Texto>
      <Texto style={styles.detalhes}>{formatarTelefone(contato.telefone)}</Texto>
      <Texto style={styles.detalhes}>Prioridade {contato.prioridade}</Texto>
      <Botao
        titulo="Ligar"
        rotulo={`Ligar para ${contato.apelido}, ${contato.nome}`}
        icone="call-outline"
        onPress={aoLigar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    padding: espacos.medio,
    gap: espacos.pequeno,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.acao,
    backgroundColor: cores.fundo,
  },
  apelido: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  nome: { fontSize: fontes.botao, color: cores.texto },
  detalhes: { fontSize: fontes.corpo, color: cores.textoSecundario },
});

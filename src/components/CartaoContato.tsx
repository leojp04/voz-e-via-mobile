// Cartao de um contato de emergencia na lista: nome, parentesco (opcional no Java), telefone e
// prioridade, com o botao "Ligar" que abre o discador. O leitor de tela le o rotulo do botao
// com nome e parentesco, para saber QUEM vai ser chamado.

import { StyleSheet, View } from 'react-native';

import type { Contato } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { formatarTelefone } from '../utils/formatar-telefone';
import { Botao } from './Botao';
import { Texto } from './Texto';

interface PropsCartaoContato {
  contato: Contato;
  aoLigar: () => void;
  aoEditar: () => void;
}

export function CartaoContato({ contato, aoLigar, aoEditar }: PropsCartaoContato) {
  const quem = contato.parentesco ? `${contato.nome}, ${contato.parentesco}` : contato.nome;
  return (
    <View style={styles.cartao}>
      <Texto style={styles.nome}>{contato.nome}</Texto>
      {contato.parentesco ? <Texto style={styles.parentesco}>{contato.parentesco}</Texto> : null}
      <Texto style={styles.detalhes}>{formatarTelefone(contato.telefone)}</Texto>
      <Texto style={styles.detalhes}>Prioridade {contato.prioridade}</Texto>
      <Botao titulo="Ligar" rotulo={`Ligar para ${quem}`} icone="call-outline" onPress={aoLigar} />
      <Botao
        titulo="Editar"
        rotulo={`Editar ${quem}`}
        variante="secundario"
        icone="create-outline"
        onPress={aoEditar}
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
  nome: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  parentesco: { fontSize: fontes.botao, color: cores.texto },
  detalhes: { fontSize: fontes.corpo, color: cores.textoSecundario },
});
